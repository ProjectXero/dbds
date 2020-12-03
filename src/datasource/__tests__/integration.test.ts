import assert from 'assert'
import { createPool, DatabasePoolType, sql } from 'slonik'

import { DBDataSource } from '..'

interface DummyRowType {
  id: number
  name: string
  code: string
  withDefault?: string
}

const columnTypes: Record<keyof DummyRowType, string> = {
  id: 'int8',
  name: 'citext',
  code: 'text',
  withDefault: 'text',
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
        "with_default" TEXT NOT NULL DEFAULT 'anything'
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
      const row = {
        id: 2,
        code: 'CODE',
        name: 'Test Row',
        withDefault: 'asdf',
      }
      const result = await ds.testInsert(row)
      expect(result).toMatchObject({
        id: 2,
        code: 'CODE',
        name: 'Test Row',
        with_default: 'asdf',
      })
    })
  })

  it('can insert rows with raw sql and without', async () => {
    const rows = [
      {
        id: 5,
        code: 'A',
        name: 'abc',
        withDefault: sql`DEFAULT`,
      },
      {
        id: 6,
        code: 'B',
        name: 'def',
        withDefault: 'value',
      },
      {
        id: 7,
        code: 'C',
        name: 'ghi',
      },
    ]

    const results = await ds.testInsert(rows)
    expect(results).toHaveLength(3)
    expect(results).toContainEqual({
      id: 5,
      code: 'A',
      name: 'abc',
      with_default: 'anything',
    })
    expect(results).toContainEqual({
      id: 6,
      code: 'B',
      name: 'def',
      with_default: 'value',
    })
    expect(results).toContainEqual({
      id: 7,
      code: 'C',
      name: 'ghi',
      with_default: 'anything',
    })
  })

  it('can insert rows with columns of arbitrary case', async () => {
    const result = await ds.testInsert({
      id: 8,
      code: 'D',
      name: 'jkl',
      withDefault: 'aaaa',
    } as any)

    expect(result).toMatchObject({
      id: 8,
      code: 'D',
      name: 'jkl',
      with_default: 'aaaa',
    })
  })

  describe('when there is data in the table', () => {
    const row = {
      id: 2,
      code: 'CODE',
      name: 'Test Row',
      withDefault: 'asdf',
    }

    it('can select rows by various criteria', async () => {
      const expected = {
        id: 2,
        code: 'CODE',
        name: 'Test Row',
        with_default: 'asdf',
      }
      await ds.testInsert(row)

      const resultAll = await ds.get()
      expect(resultAll).toContainEqual(expected)

      const result1 = await ds.get({ where: { id: 2 }, expected: 'maybeOne' })
      expect(result1).toMatchObject(expected)

      const result2 = await ds.get({
        where: { code: 'CODE' },
        expected: 'maybeOne',
      })
      expect(result2).toMatchObject(expected)

      const result3 = await ds.get({
        where: { name: 'TEST ROW' },
        expected: 'maybeOne',
      })
      expect(result3).toMatchObject(expected)
    })

    it('can insert more rows', async () => {
      await ds.testInsert(row)

      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
      }
      const result = await ds.testInsert([newRow1, newRow2])
      expect(result).toContainEqual({
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      })
      expect(result).toContainEqual({
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      })
    })

    it('can update rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
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
        id: 10,
        code: 'NEW CODE',
        name: 'any',
        with_default: 'asdf',
      })
    })

    it('can delete rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testDelete({
        where: {
          id: newRow1.id,
        },
        expected: 'one',
      })

      expect(result).toMatchObject({
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      })

      const remaining = await ds.get()
      expect(remaining).toHaveLength(1)
      expect(remaining).toContainEqual({
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      })
    })

    it('can use loaders to lookup rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        withDefault: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        withDefault: 'asdf',
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.idLoader.load(newRow1.id)
      expect(result).toMatchObject({
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      })
    })
  })
})
