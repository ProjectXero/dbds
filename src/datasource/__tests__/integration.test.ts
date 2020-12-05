import assert from 'assert'
import { createPool, DatabasePoolType, sql, SqlSqlTokenType } from 'slonik'

import { DBDataSource } from '..'

interface DummyRowType {
  id: number
  name: string
  code: string
  withDefault?: string | SqlSqlTokenType
  tsTest: Date
  jsonbTest: { a: number }
}

const columnTypes: Record<keyof DummyRowType, string> = {
  id: 'int8',
  name: 'citext',
  code: 'text',
  withDefault: 'text',
  tsTest: 'timestamptz',
  jsonbTest: 'jsonb',
}

let pool: DatabasePoolType

beforeAll(async () => {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured')

  pool = createPool(process.env.DATABASE_URL, {
    captureStackTrace: true,
    maximumPoolSize: 1,
    idleTimeout: 'DISABLE_TIMEOUT',
    idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
  })

  await pool.transaction(async (connection) => {
    await connection.query(sql`
      CREATE EXTENSION citext
    `)
    await connection.query(sql`
      CREATE TABLE "test_table" (
        "id" INTEGER PRIMARY KEY,
        "name" CITEXT NOT NULL,
        "code" TEXT NOT NULL,
        "with_default" TEXT NOT NULL DEFAULT 'anything',
        "ts_test" TIMESTAMPTZ NOT NULL,
        "jsonb_test" JSONB NOT NULL
      )
    `)
  })
})

class TestDataSource extends DBDataSource<DummyRowType> {
  constructor() {
    super(pool, 'test_table', columnTypes)
  }

  public idLoader = this.loaders.create('id')

  // these functions are protected, so we're not normally able to access them
  public testInsert: TestDataSource['insert'] = this.insert
  public testUpdate: TestDataSource['update'] = this.update
  public testDelete: TestDataSource['delete'] = this.delete
}

let ds: TestDataSource

beforeEach(() => {
  ds = new TestDataSource()
})

afterEach(() => {
  pool.query(sql`TRUNCATE test_table`)
})

describe(DBDataSource, () => {
  describe('when the table is empty', () => {
    it('select returns an empty array', async () => {
      const result = await ds.get()
      expect(result).toHaveLength(0)
    })

    it('throws an exception when expecting one result', () => {
      expect(
        ds.get({ expected: 'one' })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Resource not found."`)
    })

    it('can insert new rows', async () => {
      const row: DummyRowType = {
        id: 2,
        code: 'CODE',
        name: 'Test Row',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.000Z'),
        jsonbTest: { a: 1 },
      }
      const result = await ds.testInsert(row)
      console.log(result)
      expect(result).toMatchObject(row)
    })
  })

  it('can insert rows with raw sql and without', async () => {
    const row1: DummyRowType = {
      id: 5,
      code: 'A',
      name: 'abc',
      withDefault: sql`DEFAULT`,
      tsTest: new Date('2020-12-05T00:00:00.001Z'),
      jsonbTest: { a: 1 },
    }
    const row2: DummyRowType = {
      id: 6,
      code: 'B',
      name: 'def',
      withDefault: 'value',
      tsTest: new Date('2020-12-05T00:00:00.002Z'),
      jsonbTest: { a: 2 },
    }
    const row3: DummyRowType = {
      id: 7,
      code: 'C',
      name: 'ghi',
      tsTest: new Date('2020-12-05T00:00:00.003Z'),
      jsonbTest: { a: 3 },
    }

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

  it('can insert rows with columns of arbitrary case', async () => {
    const row: DummyRowType = {
      id: 8,
      code: 'D',
      name: 'jkl',
      withDefault: 'aaaa',
      tsTest: new Date('2020-12-05T00:00:00.000Z'),
      jsonbTest: { a: 1 },
    }
    const result = await ds.testInsert(row)

    expect(result).toMatchObject(row)
  })

  describe('when there is data in the table', () => {
    const row: DummyRowType = {
      id: 2,
      code: 'CODE',
      name: 'Test Row',
      withDefault: 'asdf',
      tsTest: new Date('2020-12-05T00:00:00.000Z'),
      jsonbTest: { a: 0 },
    }

    it('can select rows by various criteria', async () => {
      await ds.testInsert(row)

      const resultAll = await ds.get()
      expect(resultAll).toContainEqual(row)

      const result1 = await ds.get({ where: { id: 2 }, expected: 'maybeOne' })
      expect(result1).toMatchObject(row)

      const result2 = await ds.get({
        where: { code: 'CODE' },
        expected: 'maybeOne',
      })
      expect(result2).toMatchObject(row)

      const result3 = await ds.get({
        where: { name: 'TEST ROW' },
        expected: 'maybeOne',
      })
      expect(result3).toMatchObject(row)
    })

    it('can insert more rows', async () => {
      await ds.testInsert(row)

      const newRow1: DummyRowType = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      }
      const newRow2: DummyRowType = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      }
      const result = await ds.testInsert([newRow1, newRow2])
      expect(result).toContainEqual(newRow1)
      expect(result).toContainEqual(newRow2)
    })

    it('can update rows', async () => {
      const newRow1: DummyRowType = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      }
      const newRow2: DummyRowType = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      }

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
      const newRow1: DummyRowType = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      }
      const newRow2: DummyRowType = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testDelete({
        where: {
          id: newRow1.id,
        },
        expected: 'one',
      })

      expect(result).toMatchObject(newRow1)

      const remaining = await ds.get()
      expect(remaining).toHaveLength(1)
      expect(remaining).toContainEqual(newRow2)
    })

    it('can use loaders to lookup rows', async () => {
      const newRow1: DummyRowType = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.001Z'),
        jsonbTest: { a: 1 },
      }
      const newRow2: DummyRowType = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
        tsTest: new Date('2020-12-05T00:00:00.002Z'),
        jsonbTest: { a: 2 },
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.idLoader.load(newRow1.id)
      expect(result).toMatchObject(newRow1)
    })
  })
})
