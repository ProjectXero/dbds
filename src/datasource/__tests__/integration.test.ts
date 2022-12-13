import assert from 'assert'
import { createPool, DatabasePool, sql } from 'slonik'
import { z } from 'zod'

import { DBDataSource } from '..'

const DEFAULT = DBDataSource.defaultSymbol

const DummyMetadata = {
  id: {
    nativeType: 'int8',
    nativeName: 'id',
  },
  name: {
    nativeType: 'citext',
    nativeName: 'name',
  },
  code: {
    nativeType: 'text',
    nativeName: 'code',
  },
  withDefault: {
    nativeType: 'text',
    nativeName: 'with_default',
  },
  camelCase: {
    nativeType: 'text',
    nativeName: 'camel_case',
  },
  tsTest: {
    nativeType: 'timestamptz',
    nativeName: 'ts_test',
  },
  dateTest: {
    nativeType: 'date',
    nativeName: 'date_test',
  },
  jsonbTest: {
    nativeType: 'jsonb',
    nativeName: 'jsonb_test',
  },
  nullable: {
    nativeType: 'text',
    nativeName: 'nullable',
  },
}

const Dummy$SelectSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  withDefault: z.string(),
  camelCase: z.string(),
  tsTest: z.date(),
  dateTest: z.date(),
  jsonbTest: z.object({ a: z.number() }),
  nullable: z.string().nullish(),
})

const Dummy$InsertSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  withDefault: z.string().or(z.literal(DBDataSource.defaultSymbol)).optional(),
  camelCase: z.string(),
  tsTest: z.date(),
  dateTest: z.date(),
  jsonbTest: z.object({ a: z.number() }),
  nullable: z.string().nullish(),
})

const DefaultJsonbSchema = z.object({
  a: z.number(),
})

let pool: DatabasePool

const createRow = <Schema>(
  values: Partial<Omit<z.infer<typeof Dummy$InsertSchema>, keyof Schema>> &
    Schema
): Omit<z.infer<typeof Dummy$InsertSchema>, keyof Schema> & Schema => {
  return {
    id: 1,
    code: '',
    name: '',
    camelCase: '',
    tsTest: new Date('2020-12-05T00:00:00.000Z'),
    dateTest: new Date('2021-04-19'),
    jsonbTest: { a: 1 },
    nullable: null,
    ...values,
  }
}

beforeAll(async () => {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured')

  pool = await createPool(process.env.DATABASE_URL, {
    captureStackTrace: true,
    maximumPoolSize: 1,
    idleTimeout: 'DISABLE_TIMEOUT',
    idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
  })

  await pool.transaction(async (connection) => {
    await connection.query(sql.unsafe`
      CREATE EXTENSION IF NOT EXISTS citext
    `)
    await connection.query(sql.unsafe`
      CREATE TABLE IF NOT EXISTS "test_table" (
        "id" INTEGER PRIMARY KEY,
        "name" CITEXT NOT NULL,
        "code" TEXT NOT NULL,
        "with_default" TEXT NOT NULL DEFAULT 'anything',
        "camel_case" TEXT NOT NULL,
        "ts_test" TIMESTAMPTZ NOT NULL,
        "date_test" DATE NOT NULL,
        "jsonb_test" JSONB NOT NULL,
        "nullable" TEXT
      )
    `)
  })
})

class TestDataSource<TSchema extends z.ZodTypeAny> extends DBDataSource<{
  name: 'test_table'
  metadata: typeof DummyMetadata
  schemas: {
    select: z.ZodObject<
      z.extendShape<typeof Dummy$SelectSchema['shape'], { jsonbTest: TSchema }>,
      'strip',
      z.ZodTypeAny
    >
    insert: z.ZodObject<
      z.extendShape<typeof Dummy$InsertSchema['shape'], { jsonbTest: TSchema }>,
      'strip',
      z.ZodTypeAny
    >
    update: z.ZodObject<{
      [k in keyof z.extendShape<
        typeof Dummy$InsertSchema['shape'],
        { jsonbTest: TSchema }
      >]: z.ZodOptional<
        z.extendShape<
          typeof Dummy$InsertSchema['shape'],
          { jsonbTest: TSchema }
        >[k]
      >
    }>
  }
}> {
  constructor(jsonbSchema: TSchema) {
    const schema$select = Dummy$SelectSchema.extend({ jsonbTest: jsonbSchema })
    const schema$insert = Dummy$InsertSchema.extend({ jsonbTest: jsonbSchema })

    super(pool, {
      name: 'test_table',
      metadata: DummyMetadata,
      schemas: {
        select: schema$select,
        insert: schema$insert,
        update: schema$insert.partial(),
      },
    })
  }

  public idLoader = this.loaders.create('id')
  public a = this.loaders.create('dateTest')
  public codeLoader = this.loaders.create('code', {
    multi: true,
    orderBy: ['id', 'DESC'],
  })

  public idAndCodeLoader = this.loaders.createMulti(['name', 'code'], {
    multi: true,
  })

  public idAndCamelCaseLoader = this.loaders.createMulti(['id', 'camelCase'])
  public castingLoader = this.loaders.createMulti(
    ['id', 'name'],
    ['text', 'text']
  )

  // these functions are protected, so we're not normally able to access them
  public testGet: TestDataSource<TSchema>['get'] = this.get
  public testCount: TestDataSource<TSchema>['count'] = this.count
  public testCountGroup: TestDataSource<TSchema>['countGroup'] = this.countGroup
  public testInsert: TestDataSource<TSchema>['insert'] = this.insert
  public testUpdate: TestDataSource<TSchema>['update'] = this.update
  public testDelete: TestDataSource<TSchema>['delete'] = this.delete
}

let ds: TestDataSource<typeof DefaultJsonbSchema>

beforeEach(() => {
  ds = new TestDataSource(DefaultJsonbSchema)
})

afterEach(async () => {
  await pool.query(sql.unsafe`TRUNCATE test_table`)
})

afterAll(async () => {
  await pool.end()
})

describe('DBDataSource', () => {
  describe('when the table is empty', () => {
    it('select returns an empty array', async () => {
      const result = await ds.testGet()
      expect(result).toHaveLength(0)
    })

    it('throws an exception when expecting one result', async () => {
      await expect(
        ds.testGet({ expected: 'one' })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Resource not found."`)
    })

    it('can insert new rows', async () => {
      const row = createRow({
        id: 2,
        code: 'CODE',
        name: 'Test Row',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.000Z'),
        jsonbTest: { a: 1 },
      })
      const result = await ds.testInsert(row)
      expect(result).toMatchObject(row)
    })
  })

  it('can insert rows with raw sql and without', async () => {
    const row1 = createRow({
      id: 5,
      code: 'A',
      name: 'abc',
      withDefault: DEFAULT,
      tsTest: new Date('2020-12-05T00:00:00.001Z'),
      jsonbTest: { a: 1 },
    })
    const row2 = createRow({
      id: 6,
      code: 'B',
      name: 'def',
      withDefault: 'value',
      tsTest: new Date('2020-12-05T00:00:00.002Z'),
      jsonbTest: { a: 2 },
    })
    const row3 = createRow({
      id: 7,
      code: 'C',
      name: 'ghi',
      tsTest: new Date('2020-12-05T00:00:00.003Z'),
      jsonbTest: { a: 3 },
    })

    const results = await ds.testInsert([row1, row2, row3])
    expect(results).toHaveLength(3)
    expect(results).toContainEqual({
      ...row1,
      withDefault: 'anything',
    })
    expect(results).toContainEqual(row2)
    expect(results).toContainEqual({
      ...row3,
      withDefault: 'anything',
    })
  })

  describe('when given an array with one input', () => {
    it('returns an array of results', async () => {
      const row1 = createRow({
        id: 99,
        code: 'A',
        name: 'abc',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })

      const results = await ds.testInsert([row1])
      expect(Array.isArray(results)).toBe(true)
    })
  })

  it('can insert rows with columns of arbitrary case', async () => {
    const row = createRow({
      id: 8,
      code: 'D',
      name: 'jkl',
      withDefault: 'aaaa',
      tsTest: new Date('2020-12-05T00:00:00.000Z'),
      jsonbTest: { a: 1 },
    })
    const result = await ds.testInsert(row)

    expect(result).toMatchObject(row)
  })

  describe('when there is data in the table', () => {
    const row = createRow({
      id: 2,
      code: 'CODE',
      name: 'Test Row',
      withDefault: 'asdf',
      tsTest: new Date('2020-12-05T00:00:00.000Z'),
      jsonbTest: { a: 0 },
    })

    it('can select rows by various criteria', async () => {
      await ds.testInsert(row)

      const resultAll = await ds.testGet()
      expect(resultAll).toContainEqual(row)

      const result1 = await ds.testGet({
        where: { id: 2 },
        expected: 'maybeOne',
      })
      expect(result1).toMatchObject(row)

      const result2 = await ds.testGet({
        where: { code: 'CODE' },
        expected: 'maybeOne',
      })
      expect(result2).toMatchObject(row)

      const result3 = await ds.testGet({
        where: { name: 'TEST ROW' },
        expected: 'maybeOne',
      })
      expect(result3).toMatchObject(row)
    })

    it('can select rows for update', async () => {
      await ds.testInsert(row)

      const result = await ds.testGet({ forUpdate: true, expected: 'one' })
      expect(result).toMatchObject(row)
    })

    it('can insert more rows', async () => {
      await ds.testInsert(row)

      const newRow1 = createRow({
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })
      const newRow2 = createRow({
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      })
      const result = await ds.testInsert([newRow1, newRow2])
      expect(result).toContainEqual(newRow1)
      expect(result).toContainEqual(newRow2)
    })

    it('can update rows', async () => {
      const newRow1 = createRow({
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })
      const newRow2 = createRow({
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      })

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testUpdate(
        {
          code: 'NEW CODE',
        },
        {
          where: {
            id: newRow1.id,
          },
        }
      )

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({
        ...newRow1,
        code: 'NEW CODE',
      })
    })

    it('can delete rows', async () => {
      const newRow1 = createRow({
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })
      const newRow2 = createRow({
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      })

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testDelete({
        where: {
          id: newRow1.id,
        },
        expected: 'one',
      })

      expect(result).toMatchObject(newRow1)

      const remaining = await ds.testGet()
      expect(remaining).toHaveLength(1)
      expect(remaining).toContainEqual(newRow2)
    })

    it('can use loaders to lookup rows', async () => {
      const newRow1 = createRow({
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })
      const newRow2 = createRow({
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      })

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.idLoader.load(newRow1.id)
      expect(result).toMatchObject(newRow1)
    })

    it('can set query options on a loader', async () => {
      const row1 = createRow({
        id: 19,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      })
      const row2 = createRow({
        id: 20,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 1 },
      })

      await ds.testInsert([row1, row2])

      const result = await ds.codeLoader.load('any')
      expect(result).toMatchSnapshot()
    })

    it('can lookup rows by null values', async () => {
      const row1 = createRow({
        id: 19,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
        nullable: 'not null',
      })
      const row2 = createRow({
        id: 20,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 1 },
        nullable: null,
      })

      await ds.testInsert([row1, row2])

      const result = await ds.testGet({
        where: { nullable: null },
        expected: 'one',
      })
      expect(result).toMatchObject(row2)
    })

    it('can lookup rows by one of multiple values including null', async () => {
      const row1 = createRow({
        id: 19,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
        nullable: 'not null',
      })
      const row2 = createRow({
        id: 20,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 1 },
        nullable: null,
      })

      await ds.testInsert([row1, row2])

      const result = await ds.testGet({
        where: { nullable: ['non-existent value', null] },
        expected: 'one',
      })
      expect(result).toMatchObject(row2)
    })
  })

  describe('counting rows', () => {
    it('can count all rows in the table', async () => {
      const rows = [
        createRow({ id: 21 }),
        createRow({ id: 22 }),
        createRow({ id: 23 }),
      ]
      await ds.testInsert(rows)

      const result = await ds.testCount()
      expect(result).toEqual(rows.length)
    })

    it('can count rows in groups', async () => {
      const rows = [
        createRow({ id: 24, code: 'ONE' }),
        createRow({ id: 25, code: 'TWO' }),
        createRow({ id: 26, code: 'TWO' }),
        createRow({ id: 27, code: 'THREE' }),
        createRow({ id: 28, code: 'THREE' }),
        createRow({ id: 29, code: 'THREE' }),
      ]
      await ds.testInsert(rows)

      const [...result] = await ds.testCountGroup(['code'])
      expect(result.sort((a, b) => a.count - b.count)).toEqual(
        [
          { code: 'ONE', count: 1 },
          { code: 'TWO', count: 2 },
          { code: 'THREE', count: 3 },
        ].sort((a, b) => a.count - b.count)
      )
    })
  })

  describe('multi-column loader', () => {
    it('can query data successfully', async () => {
      const rows = [
        createRow({ id: 30, name: 'hello', code: 'secret' }),
        createRow({ id: 31, name: 'noway', code: 'secret' }),
      ]
      await ds.testInsert(rows)

      expect(
        await ds.idAndCodeLoader.load({ name: 'hello', code: 'secret' })
      ).toMatchSnapshot()
    })

    it('can query data correctly with casing differences', async () => {
      const row = createRow({
        id: 32,
        camelCase: 'value1',
      })
      await ds.testInsert(row)

      expect(
        await ds.idAndCamelCaseLoader.load({ id: 32, camelCase: 'value1' })
      ).toMatchSnapshot()
    })

    it('can cast values correctly', async () => {
      const row = createRow({
        id: 33,
        name: '7963ad1f-3289-4a50-860a-56e3571d27db',
      })
      await ds.testInsert(row)

      await expect(
        ds.castingLoader.load({
          // @ts-expect-error this is a test for casting
          id: 'some string',
          name: 'not a valid uuid',
        })
      ).resolves.not.toThrowError()
    })
  })

  describe('transaction support', () => {
    it('can use transactions successfully', async () => {
      const row = createRow({
        id: 34,
      })

      await expect(
        ds.transaction<void>(async () => {
          await ds.testInsert(row)
          expect(
            await ds.testGet({ where: { id: 34 }, expected: 'maybeOne' })
          ).toBeTruthy()

          throw new Error('rollback')
        })
      ).rejects.toThrowError('rollback')

      expect(
        await ds.testGet({ where: { id: 34 }, expected: 'maybeOne' })
      ).toBeFalsy()
    })

    it('handles loader cache clearing correctly', async () => {
      const row = createRow({
        id: 35,
      })

      await expect(
        ds.transaction<void>(async () => {
          await ds.testInsert(row)
          expect(await ds.idLoader.load(35)).toBeTruthy()

          throw new Error('rollback')
        })
      ).rejects.toThrowError('rollback')

      expect(await ds.idLoader.load(35)).toBeFalsy()
    })

    it("doesn't clear already-cached loader items", async () => {
      const row = createRow({
        id: 36,
      })
      await ds.testInsert(row)
      await ds.idLoader.load(36)

      await expect(
        ds.transaction<void>(async () => {
          expect(await ds.idLoader.load(36)).toBeTruthy()
          throw new Error('rollback')
        })
      ).rejects.toThrowError('rollback')

      expect(await ds.idLoader.load(36)).toBeTruthy()
    })

    it('uses transactions cross-datasource', async () => {
      const ds2 = new TestDataSource(DefaultJsonbSchema)

      const row = createRow({
        id: 37,
      })

      await expect(
        ds.transaction<void>(async () => {
          await ds.testInsert(row)
          expect(
            await ds2.testGet({ where: { id: 37 }, expected: 'maybeOne' })
          ).toBeTruthy()

          throw new Error('rollback')
        })
      ).rejects.toThrowError('rollback')

      expect(
        await ds2.testGet({ where: { id: 37 }, expected: 'maybeOne' })
      ).toBeFalsy()
    })
  })

  describe('json column schemas', () => {
    const schema = z.object({
      a: z.number(),
    })

    let ds: TestDataSource<typeof schema>

    beforeEach(() => {
      ds = new TestDataSource(schema)
    })

    describe('when inserting', () => {
      describe('one row', () => {
        describe('with a valid schema', () => {
          it('throws no errors', async () => {
            await expect(
              ds.testInsert(createRow({ id: 34, jsonbTest: { a: 2222 } }))
            ).resolves.not.toThrowError()
          })

          it('inserts the row', async () => {
            const result = await ds.testInsert(
              createRow({ id: 34, jsonbTest: { a: 2222 } })
            )
            expect(result.id).toEqual(34)
          })
        })

        describe('with an invalid schema (invalid value)', () => {
          it('throws an error', async () => {
            await expect(
              // @ts-expect-error testing types
              ds.testInsert(createRow({ id: 36, jsonbTest: { a: 'asdf' } }))
            ).rejects.toThrowError('Expected number, received string')
          })

          it("doesn't insert the row", async () => {
            try {
              await ds.testInsert(
                // @ts-expect-error testing types
                createRow({ id: 36, jsonbTest: { a: 'asdf' } })
              )
            } catch {
              // swallow the error
            }
            const result = await ds.testGet()
            expect(result.length).toEqual(0)
          })
        })

        describe('with an invalid schema (missing key)', () => {
          it('throws an error', async () => {
            await expect(
              // @ts-expect-error testing types
              ds.testInsert(createRow({ id: 36, jsonbTest: {} }))
            ).rejects.toThrowError('Required')
          })

          it("doesn't insert the row", async () => {
            try {
              // @ts-expect-error testing types
              await ds.testInsert(createRow({ id: 36, jsonbTest: {} }))
            } catch {
              // swallow the error
            }
            const result = await ds.testGet()
            expect(result.length).toEqual(0)
          })
        })

        describe('with an invalid schema (extra key)', () => {
          it('inserts the row, but removes the extra key', async () => {
            const result = await ds.testInsert(
              createRow({ id: 36, jsonbTest: { a: 9, extra: 'anything' } })
            )
            // @ts-expect-error testing types
            expect(result.jsonbTest.extra).toBeUndefined()
          })
        })
      })

      describe('multiple rows', () => {
        describe('with all valid schemas', () => {
          it('throws no errors', async () => {
            await expect(
              ds.testInsert([
                createRow({ id: 37, jsonbTest: { a: 2222 } }),
                createRow({ id: 38, jsonbTest: { a: 2223 } }),
              ])
            ).resolves.not.toThrowError()
          })

          it('inserts the rows', async () => {
            const row1 = createRow({ id: 39, jsonbTest: { a: 2222 } })
            const row2 = createRow({ id: 40, jsonbTest: { a: 2223 } })
            const result = await ds.testInsert([row1, row2])
            expect(result.length).toEqual(2)
            expect(result).toContainEqual(
              expect.objectContaining({ id: row1.id })
            )
            expect(result).toContainEqual(
              expect.objectContaining({ id: row2.id })
            )
          })
        })

        describe('with at least one invalid schema', () => {
          it('throws an error', async () => {
            await expect(
              ds.testInsert([
                // @ts-expect-error testing types
                createRow({ id: 41, jsonbTest: { a: 'asdf' } }),
                createRow({ id: 42, jsonbTest: { a: 2223 } }),
              ])
            ).rejects.toThrowError('Expected number, received string')
          })

          it('inserts no rows', async () => {
            try {
              await ds.testInsert([
                // @ts-expect-error testing types
                createRow({ id: 43, jsonbTest: { a: 'asdf' } }),
                createRow({ id: 44, jsonbTest: { a: 2223 } }),
              ])
            } catch {
              // swallow the error
            }
            const result = await ds.testGet({ expected: 'any' })
            expect(result.length).toBe(0)
          })
        })
      })
    })

    describe('when updating', () => {
      const originalValue = 2222

      beforeEach(async () => {
        const row = createRow({ id: 39, jsonbTest: { a: originalValue } })
        await ds.testInsert(row)
      })
      describe('and given a valid schema', () => {
        it('throws no errors and inserts correctly', async () => {
          await expect(
            ds.testUpdate({ jsonbTest: { a: 1234 } })
          ).resolves.not.toThrowError()
        })

        it('updates the row', async () => {
          const newValue = 9999
          const result = await ds.testUpdate(
            { jsonbTest: { a: newValue } },
            {
              where: { id: 39 },
              expected: 'one',
            }
          )
          expect(result.jsonbTest.a).toEqual(newValue)
        })
      })

      describe('and given an invalid schema', () => {
        it('throws an error', async () => {
          await expect(
            // @ts-expect-error testing types
            ds.testUpdate({ jsonbTest: { a: 'asdf' } })
          ).rejects.toThrowError('Expected number, received string')
        })

        it("doesn't update the row", async () => {
          try {
            await ds.testUpdate(
              // @ts-expect-error testing types
              { jsonbTest: { a: 'asdf' } },
              {
                where: { id: 39 },
                expected: 'one',
              }
            )
          } catch {
            // swallow the error
          }
          const result = await ds.testGet({
            where: { id: 39 },
            expected: 'one',
          })
          expect(result.jsonbTest.a).toEqual(originalValue)
        })
      })
    })

    describe('with union schemas', () => {
      const schema1 = z.object({
        type: z.literal('type1'),
        someKey: z.string(),
      })

      const schema2 = z.object({
        type: z.literal('type2'),
        someOtherKey: z.number(),
      })

      const schema = z.discriminatedUnion('type', [schema1, schema2])

      let ds: TestDataSource<typeof schema>

      beforeEach(() => {
        ds = new TestDataSource(schema)
      })

      it('can process any of the given union schemas', async () => {
        const rowData1 = {
          type: 'type1',
          someKey: 'any string',
        } as const
        const rowData2 = {
          type: 'type2',
          someOtherKey: 1234,
        } as const
        const result = await ds.testInsert([
          createRow({
            id: 50,
            jsonbTest: rowData1,
          }),
          createRow({
            id: 51,
            jsonbTest: rowData2,
          }),
        ])
        expect(result.length).toEqual(2)
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ jsonbTest: rowData1 }),
            expect.objectContaining({ jsonbTest: rowData2 }),
          ])
        )
      })
    })
  })
})
