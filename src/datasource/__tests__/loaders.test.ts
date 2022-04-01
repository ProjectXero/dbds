import { LoaderFactory } from '../loaders'
import { GetDataMultiFunction } from '../loaders/types'
import { match } from '../loaders/utils'

interface DummyRowType {
  id: number
  name: string
  code: string
}

const columnTypes: Record<keyof DummyRowType, string> = {
  id: 'anything',
  name: 'anything',
  code: 'anything',
}

describe(LoaderFactory, () => {
  const dummyBatchFn = async (): Promise<DummyRowType[]> => {
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

  const factory = new LoaderFactory<DummyRowType>(dummyBatchFn, dummyBatchFn, {
    columnTypes,
  })

  describe('multi: false, ignoreCase: false', () => {
    const loader = factory.create('id', 'any', {
      multi: false,
      ignoreCase: false,
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
    const loader = factory.create('code', 'any', {
      multi: true,
      ignoreCase: false,
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
    const loader = factory.create('name', 'any', {
      multi: false,
      ignoreCase: true,
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
    const loader = factory.create('name', 'any', {
      multi: true,
      ignoreCase: true,
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
        ]) as GetDataMultiFunction<DummyRowType>
      )
      const loader = factory.createMulti(['name', 'code'], ['type1', 'type2'], {
        getData,
      })
      await loader.load({ name: 'zzz', code: 'zzz' })
      await loader.load({ name: 'zzz', code: 'zzz' })
      expect(getData.mock.calls[0][2]).toMatchInlineSnapshot(`
        Array [
          "type1",
          "type2",
        ]
      `)
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
