import { z } from 'zod'
import { FinderFactory, LoaderFactory } from '../loaders'

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

  const loaders = new LoaderFactory(dummyBatchFn, dummyBatchFn, DummyMetadata)
  const finders = new FinderFactory<z.infer<typeof DummyRowType>>()

  describe('create', () => {
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

    describe('when inferring multi from an extended loader', () => {
      const loader = loaders.create('code', { multi: true })
      const finder = finders.create(loader)

      it('gets all matching results', async () => {
        expect(await finder('abc')).toMatchSnapshot()
      })

      it('returns an empty array with no matching results', async () => {
        expect(await finder('any value with no match')).toHaveLength(0)
      })
    })
    describe('with a multi-column loader', () => {
      describe('multi: true', () => {
        const loader = loaders.createMulti(['name', 'code'], { multi: true })
        const finder = finders.create(loader)

        it('gets all matching results', async () => {
          expect(await finder({ name: 'aaa', code: 'abc' })).toMatchSnapshot()
        })
      })

      describe('multi: false', () => {
        const loader = loaders.createMulti(['id', 'code'])
        const finder = finders.create(loader)

        it('gets all matching results', async () => {
          expect(await finder({ id: 1, code: 'abc' })).toMatchSnapshot()
        })
      })

      describe('with a callback function', () => {
        const loader = loaders.createMulti(['id', 'code'], {
          callbackFn: () => {
            // i don't think we really need to do anything here tbh
          },
        })
        const finder = finders.create(loader)

        it('gets all matching results', async () => {
          expect(await finder({ id: 1, code: 'abc' })).toMatchSnapshot()
        })
      })
    })
  })
})
