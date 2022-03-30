import { DBDataSource } from '..'
import { createMockPool } from '../../testing'
import { LoaderFactory } from '../loaders'

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

  class DummyDBDataSource extends DBDataSource<DummyRowType> {
    constructor() {
      super(createMockPool(), 'any_table', {
        id: 'any',
        name: 'any',
        code: 'any',
      })
    }

    protected get loaders() {
      return factory
    }
  }

  describe('defaultOptions', () => {
    class TestDataSource extends DummyDBDataSource {
      constructor() {
        super()
        this.defaultOptions = { orderBy: 'id' }
      }

      public get testBuilder(): DummyDBDataSource['builder'] {
        return this.builder
      }
    }

    const dataSource = new TestDataSource()

    it('uses the default options', () => {
      expect(dataSource.testBuilder.select()).toMatchSnapshot()
    })
  })
})
