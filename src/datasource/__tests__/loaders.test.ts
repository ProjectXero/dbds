import { LoaderFactory } from "../loaders"
import { GetDataFunction } from "../loaders/types"
import { match } from "../loaders/utils"

interface DummyRowType {
  id: number
  name: string
  code: string
}

describe(LoaderFactory, () => {
  const dummyBatchFn: GetDataFunction<DummyRowType> = async (_args, _column, _type): Promise<DummyRowType[]> => {
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

  const factory = new LoaderFactory<DummyRowType>(dummyBatchFn)

  describe('multi: false, ignoreCase: false', () => {
    const loader = factory.create('id', 'any', { multi: false, ignoreCase: false })

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
    const loader = factory.create('code', 'any', { multi: true, ignoreCase: false })

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
    const loader = factory.create('name', 'any', { multi: false, ignoreCase: true })

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
    const loader = factory.create('name', 'any', { multi: true, ignoreCase: true })

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
})

describe(match, () => {
  it('exactly matches numbers', () => {
    expect(match(1, 1)).toBe(true)
    expect(match(1, 2)).toBe(false)
    expect(match(1.000, 1)).toBe(true)
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

  it('is resilient to non-matching types', () => {
    // @ts-expect-error
    expect(match(0, false)).toBe(false)
    // @ts-expect-error
    expect(match(null, 0)).toBe(false)
    // @ts-expect-error
    expect(match('', null)).toBe(false)
    // @ts-expect-error
    expect(match(false, '')).toBe(false)
    // @ts-expect-error
    expect(match(0, '')).toBe(false)
    // @ts-expect-error
    expect(match(false, '', true)).toBe(false)
  })
})
