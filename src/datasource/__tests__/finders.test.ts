import { FinderFactory, LoaderFactory } from '../loaders'
import { GetDataFunction } from '../loaders/types'

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
  const dummyBatchFn: GetDataFunction<DummyRowType> = async (): Promise<
    DummyRowType[]
  > => {
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

  const loaders = new LoaderFactory<DummyRowType>(dummyBatchFn, { columnTypes })
  const finders = new FinderFactory<DummyRowType>()

  describe('multi: false', () => {
    const loader = loaders.create('id')
    const finder = finders.create(loader)

    it('returns the first matching result', async () => {
      expect(await finder(1)).toMatchSnapshot()
    })

    it('returns null with no matching results', async () => {
      expect(await finder(-Infinity)).toBeNull()
    })
  })

  describe('multi: true', () => {
    const loader = loaders.create('code', { multi: true })
    const finder = finders.create(loader, { multi: true })

    it('gets all matching results', async () => {
      expect(await finder('abc')).toMatchSnapshot()
    })

    it('returns an empty array with no matching results', async () => {
      expect(await finder('any value with no match')).toHaveLength(0)
    })
  })
})
