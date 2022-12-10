import { z } from 'zod'
import { DBDataSource } from '..'
import { createMockPool } from '../../testing'
import { LoaderFactory } from '../loaders'

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

describe(DBDataSource, () => {
  const dummyBatchFn = async (): Promise<z.infer<typeof DummyRowType>[]> => {
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

  const factory = new LoaderFactory(dummyBatchFn, dummyBatchFn, DummyMetadata)

  class DummyDBDataSource extends DBDataSource<
    typeof DummyMetadata,
    typeof DummyRowType,
    typeof DummyRowType
  > {
    constructor() {
      super(
        createMockPool(),
        'any_table',
        DummyMetadata,
        DummyRowType /* select */,
        DummyRowType /* insert */
      )
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
      expect(dataSource.testBuilder.select().sql).toMatchSnapshot()
    })
  })
})
