import assert from 'assert'
import { z } from 'zod'
import { LoaderFactory } from '../loaders'
import { ExtendedDataLoader, GetDataMultiFunction } from '../loaders/types'
import { match } from '../loaders/utils'

const DummyMetadata = {
  id: {
    nativeType: 'anything',
    nativeName: 'id',
  },
  name: {
    nativeType: 'anything',
    nativeName: 'name',
  },
  code: {
    nativeType: 'anything',
    nativeName: 'code',
  },
}

const DummyRowType = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
})

describe(LoaderFactory, () => {
  const dummyBatchFn = jest.fn(
    async (): Promise<z.infer<typeof DummyRowType>[]> => {
      return [
        { id: 1, name: 'aaa', code: 'abc' },
        { id: 2, name: 'bbb', code: 'def' },
        { id: 3, name: 'Aaa', code: 'ghi' },
        { id: 4, name: 'Bbb', code: 'ABC' },
        { id: 5, name: 'AAa', code: 'DEF' },
        { id: 6, name: 'BBb', code: 'GHI' },
        { id: 7, name: 'AAA', code: 'abc' },
        { id: 8, name: 'BBB', code: 'def' },
        { id: 9, name: 'zzz', code: 'ghi' },
        { id: 10, name: 'ccc', code: 'ABC' },
        { id: 11, name: 'Ccc', code: 'DEF' },
        { id: 12, name: 'CCc', code: 'GHI' },
        { id: 13, name: 'CCC', code: 'zzz' },
      ]
    }
  )

  const getFactory = () =>
    new LoaderFactory(dummyBatchFn, dummyBatchFn, DummyMetadata)
  let factory: LoaderFactory<z.infer<typeof DummyRowType>>

  beforeEach(() => {
    factory = getFactory()
    dummyBatchFn.mockClear()
  })

  describe('multi: false, ignoreCase: false', () => {
    let loader: ExtendedDataLoader<
      false,
      number,
      z.infer<typeof DummyRowType> | undefined,
      number
    >

    beforeEach(() => {
      loader = factory.create('id', 'any', {
        multi: false,
        ignoreCase: false,
      })
    })

    it('returns the first matching result', async () => {
      expect(await loader.load(1)).toMatchSnapshot()
    })

    it('is able to load many items', async () => {
      expect(await loader.loadMany([1, 2, 3])).toMatchSnapshot()
    })

    it('returns undefined with no matching results', async () => {
      expect(await loader.load(-Infinity)).toBeUndefined()
    })
  })

  describe('multi: true, ignoreCase: false', () => {
    let loader: ExtendedDataLoader<
      true,
      string,
      z.infer<typeof DummyRowType>[],
      string
    >

    beforeEach(() => {
      loader = factory.create('code', 'any', {
        multi: true,
        ignoreCase: false,
      })
    })

    it('gets all matching results', async () => {
      expect(await loader.load('abc')).toMatchSnapshot()
    })

    it('is able to load many sets of items', async () => {
      expect(await loader.loadMany(['abc', 'def'])).toMatchSnapshot()
    })

    it('returns an empty array with no matching results', async () => {
      expect(await loader.load('any value with no match')).toHaveLength(0)
    })
  })

  describe('multi: false, ignoreCase: true', () => {
    let loader: ExtendedDataLoader<
      false,
      string,
      z.infer<typeof DummyRowType> | undefined,
      string
    >

    beforeEach(() => {
      loader = factory.create('name', 'any', {
        multi: false,
        ignoreCase: true,
      })
    })

    it('returns the first matching result', async () => {
      expect(await loader.load('AAA')).toMatchSnapshot()
    })

    it('is able to load many items', async () => {
      expect(await loader.loadMany(['AAA', 'BBB'])).toMatchSnapshot()
    })

    it('returns undefined with no matching results', async () => {
      expect(await loader.load('any value with no match')).toBeUndefined()
    })
  })

  describe('multi: true, ignoreCase: true', () => {
    let loader: ExtendedDataLoader<
      true,
      string,
      z.infer<typeof DummyRowType>[],
      string
    >

    beforeEach(() => {
      loader = factory.create('name', 'any', {
        multi: true,
        ignoreCase: true,
      })
    })

    it('gets all matching results', async () => {
      expect(await loader.load('aaa')).toMatchSnapshot()
    })

    it('is able to load many sets of items', async () => {
      expect(await loader.loadMany(['aaa', 'bbb'])).toMatchSnapshot()
    })

    it('returns an empty array with no matching results', async () => {
      expect(await loader.load('any value with no match')).toHaveLength(0)
    })
  })

  describe('with no column type specified', () => {
    it('can accept options as the second parameter', async () => {
      const loader = factory.create('name', { multi: true, ignoreCase: true })
      expect(await loader.load('AAA')).toMatchSnapshot()
    })
  })

  describe('create', () => {
    it('can accept a getData override', async () => {
      const dummyRow = { id: 999, name: 'zzz', code: 'zzz' }
      const loader = factory.create('name', {
        getData: () => [dummyRow],
      })
      expect(await loader.load('zzz')).toMatchObject(dummyRow)
    })

    it('accepts a query options function', async () => {
      const dummyRow = { id: 999, name: 'zzz', code: 'zzz' }
      const getData = jest.fn((): [z.infer<typeof DummyRowType>] => [dummyRow])
      const loader = factory.create('name', { getData }, () => ({ limit: 1 }))
      await loader.load('zzz')
      expect(getData).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          limit: 1,
        })
      )
    })
  })

  describe('createMulti', () => {
    it('can create loaders with multiple columns', async () => {
      const loader = factory.createMulti(['name', 'code'], {
        multi: true,
        ignoreCase: true,
      })
      expect(await loader.load({ name: 'ccc', code: 'abc' })).toMatchSnapshot()
    })

    it('properly batches queries', async () => {
      const loader = factory.createMulti(['name', 'code'], {
        multi: true,
        ignoreCase: true,
      })
      expect(
        await Promise.all([
          loader.load({ name: 'ccc', code: 'abc' }),
          loader.load({ name: 'aaa', code: 'def' }),
        ])
      ).toMatchSnapshot()
    })

    it('properly caches queries', async () => {
      const dummyRow = { id: 999, name: 'zzz', code: 'zzz' }
      const getData = jest.fn(() => [dummyRow])
      const loader = factory.createMulti(['name', 'code'], { getData })
      await loader.load({ name: 'zzz', code: 'zzz' })
      await loader.load({ name: 'zzz', code: 'zzz' })
      expect(getData).toBeCalledTimes(1)
    })

    it('expects columnTypes of the same length if given', () => {
      expect(() => factory.createMulti(['name', 'code'])).not.toThrowError()

      expect(() =>
        factory.createMulti(['name', 'code'], ['onlyType1'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Same number of types and keys must be provided"`
      )

      expect(() =>
        factory.createMulti(['name', 'code'], ['type1', 'type2'])
      ).not.toThrowError()

      expect(() =>
        factory.createMulti(['name', 'code'], ['type1', 'type2', 'type3?????'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Same number of types and keys must be provided"`
      )
    })

    it('passes the given types correctly', async () => {
      const dummyRow = { id: 999, name: 'zzz', code: 'zzz' }
      const getData = jest.fn(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ((_args, _columns, _types, _options) => [
          dummyRow,
        ]) as GetDataMultiFunction<z.infer<typeof DummyRowType>>
      )
      const loader = factory.createMulti(['name', 'code'], ['type1', 'type2'], {
        getData,
      })
      await loader.load({ name: 'zzz', code: 'zzz' })
      await loader.load({ name: 'zzz', code: 'zzz' })
      expect(getData.mock.calls[0][2]).toMatchInlineSnapshot(`
        [
          "type1",
          "type2",
        ]
      `)
    })

    it('accepts a query options function', async () => {
      const dummyRow = { id: 999, name: 'zzz', code: 'zzz' }
      const getData = jest.fn((): [z.infer<typeof DummyRowType>] => [dummyRow])
      const loader = factory.createMulti(['name', 'code'], { getData }, () => ({
        limit: 1,
      }))
      await loader.load({ name: 'zzz', code: 'zzz' })
      expect(getData).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          limit: 1,
        })
      )
    })
  })

  describe('auto-priming loaders', () => {
    it("doesn't auto-prime loaders without the option set", async () => {
      const loader1 = factory.create('id')
      const loader2 = factory.create('id')
      await loader1.load(1)
      await loader2.load(1)
      expect(dummyBatchFn).toBeCalledTimes(2)
    })

    it('auto-primes loaders when the option is set', async () => {
      const loader1 = factory.create('id', { autoPrime: true })
      const loader2 = factory.create('id', { autoPrime: true })
      await loader1.load(1)
      await loader2.load(1)
      expect(dummyBatchFn).toBeCalledTimes(1)
    })

    it('allows a specific list of loaders to be auto-primed', async () => {
      const loader1 = factory.create('id')
      const loader2 = factory.create('id', {
        autoPrime: true,
        primeLoaders: [loader1],
      })
      await loader2.load(1)
      expect(dummyBatchFn).toBeCalledTimes(1)
      await loader1.load(1)
      expect(dummyBatchFn).toBeCalledTimes(1)
    })

    it('allows a function to specify loaders to be auto-primed', async () => {
      const loader1 = factory.create('id', {
        autoPrime: true,
        primeLoaders: () => [loader2],
      })
      const loader2 = factory.create('id')
      await loader1.load(1)
      expect(dummyBatchFn).toBeCalledTimes(1)
      await loader2.load(1)
      expect(dummyBatchFn).toBeCalledTimes(1)
    })

    it('still calls the callback function', async () => {
      const callbackFn = jest.fn()
      const loader1 = factory.create('id', { autoPrime: true, callbackFn })
      factory.create('id', { autoPrime: true })
      await loader1.load(1)
      expect(callbackFn).toBeCalled()
    })

    it('can prime multi-column loaders', async () => {
      const loader1 = factory.create('id', { autoPrime: true })
      const loader2 = factory.createMulti(['id', 'code'], { autoPrime: true })
      const result1 = await loader1.load(2)
      assert(result1)
      expect(dummyBatchFn).toBeCalledTimes(1)
      const result2 = await loader2.load({ code: result1.code, id: result1.id })
      expect(dummyBatchFn).toBeCalledTimes(1)
      expect(result2).toBe(result1)
    })
  })
})

describe(match, () => {
  it('exactly matches numbers', () => {
    expect(match(1, 1)).toBe(true)
    expect(match(1, 2)).toBe(false)
    expect(match(1.0, 1)).toBe(true)
    expect(match(1.001, 1)).toBe(false)
    expect(match(Infinity, 0)).toBe(false)
  })

  it('exactly matches strings', () => {
    expect(match('', '')).toBe(true)
    expect(match('a', '')).toBe(false)
    expect(match('a', 'a')).toBe(true)
    expect(match('', 'a')).toBe(false)
    expect(match('a', 'asdf')).toBe(false)
  })

  it('performs case-insensitive comparison on strings', () => {
    expect(match('a', 'A', true)).toBe(true)
    expect(match('a', 'a', true)).toBe(true)
    expect(match('', '', true)).toBe(true)
    expect(match('a', 'asdf', true)).toBe(false)
    expect(match('a', 'AA', true)).toBe(false)
  })
})
