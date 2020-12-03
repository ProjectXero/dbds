import { DBDataSource } from '..'
import { createMockPool } from '../../testing'
import { LoaderFactory } from '../loaders'
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

describe(DBDataSource, () => {
  const dummyBatchFn: GetDataFunction<DummyRowType> = async (
    _args,
    _column,
    _type
  ): Promise<DummyRowType[]> => {
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

  const factory = new LoaderFactory<DummyRowType>(dummyBatchFn, { columnTypes })

  class DummyDBDataSource extends DBDataSource<DummyRowType> {
    constructor() {
      super(createMockPool(), 'any_table', {
        id: 'any',
        name: 'any',
        code: 'any',
      })
      this.loaders = factory
    }
  }

  describe('createColumnLoader', () => {
    class TestDataSource extends DummyDBDataSource {
      public testLoader = this.createColumnLoader<number>('id', 'any')
    }

    const dataSource = new TestDataSource()

    it('returns the first matching result', async () => {
      expect(await dataSource.testLoader.load(1)).toMatchSnapshot()
    })

    it('is able to load many items', async () => {
      expect(await dataSource.testLoader.loadMany([1, 2, 3])).toMatchSnapshot()
    })

    it('returns undefined with no matching results', async () => {
      expect(await dataSource.testLoader.load(-Infinity)).toBeUndefined()
    })
  })

  describe('createColumnMultiLoader', () => {
    class TestDataSource extends DummyDBDataSource {
      public testLoader = this.createColumnMultiLoader('code', 'any')
    }

    const dataSource = new TestDataSource()

    it('gets all matching results', async () => {
      expect(await dataSource.testLoader.load('abc')).toMatchSnapshot()
    })

    it('is able to load many sets of items', async () => {
      expect(
        await dataSource.testLoader.loadMany(['abc', 'def'])
      ).toMatchSnapshot()
    })

    it('returns an empty array with no matching results', async () => {
      expect(
        await dataSource.testLoader.load('any value with no match')
      ).toHaveLength(0)
    })
  })

  describe('createColumnLoaderCI', () => {
    class TestDataSource extends DummyDBDataSource {
      public testLoader = this.createColumnLoaderCI('name', 'any')
    }

    const dataSource = new TestDataSource()

    it('returns the first matching result', async () => {
      expect(await dataSource.testLoader.load('AAA')).toMatchSnapshot()
    })

    it('is able to load many items', async () => {
      expect(
        await dataSource.testLoader.loadMany(['AAA', 'BBB'])
      ).toMatchSnapshot()
    })

    it('returns undefined with no matching results', async () => {
      expect(
        await dataSource.testLoader.load('any value with no match')
      ).toBeUndefined()
    })
  })

  describe('createColumnMultiLoaderCI', () => {
    class TestDataSource extends DummyDBDataSource {
      public testLoader = this.createColumnMultiLoaderCI('name', 'any')
    }

    const dataSource = new TestDataSource()

    it('gets all matching results', async () => {
      expect(await dataSource.testLoader.load('aaa')).toMatchSnapshot()
    })

    it('is able to load many sets of items', async () => {
      expect(
        await dataSource.testLoader.loadMany(['aaa', 'bbb'])
      ).toMatchSnapshot()
    })

    it('returns an empty array with no matching results', async () => {
      expect(
        await dataSource.testLoader.load('any value with no match')
      ).toHaveLength(0)
    })
  })
})
