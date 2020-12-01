import assert from 'assert'
import { createPool, DatabasePoolType, sql } from 'slonik'

import { DBDataSource } from '..'

interface DummyRowType {
  id: number
  name: string
  code: string
  with_default?: string
}

const columnTypes: Record<keyof DummyRowType, string> = {
  id: 'int8',
  name: 'citext',
  code: 'text',
  with_default: 'text',
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
        with_default: 'asdf',
      }
      const result = await ds.testInsert(row)
      expect(result).toMatchObject(row)
    })
  })

  it('can insert rows with raw sql and without', async () => {
    const rows = [
      {
        id: 5,
        code: 'A',
        name: 'abc',
        with_default: sql`DEFAULT`
      },
      {
        id: 6,
        code: 'B',
        name: 'def',
        with_default: 'value'
      },
      {
        id: 7,
        code: 'C',
        name: 'ghi',
      }
    ]

    const results = await ds.testInsert(rows)
    expect(results).toHaveLength(3)
    expect(results).toContainEqual({
      id: 5,
      code: 'A',
      name: 'abc',
      with_default: 'anything'
    })
    expect(results).toContainEqual({
      id: 6,
      code: 'B',
      name: 'def',
      with_default: 'value'
    })
    expect(results).toContainEqual({
      id: 7,
      code: 'C',
      name: 'ghi',
      with_default: 'anything'
    })
  })

  describe('when there is data in the table', () => {
    const row = {
      id: 2,
      code: 'CODE',
      name: 'Test Row',
      with_default: 'asdf',
    }

    it('can select rows by various criteria', async () => {
      await ds.testInsert(row)

      const resultAll = await ds.get()
      expect(resultAll).toContainEqual(row);

      const result1 = await ds.get({ where: { id: 2 }, expected: 'maybeOne' })
      expect(result1).toMatchObject(row)

      const result2 = await ds.get({ where: { code: 'CODE' }, expected: 'maybeOne' })
      expect(result2).toMatchObject(row)

      const result3 = await ds.get({ where: { name: 'TEST ROW' }, expected: 'maybeOne' })
      expect(result3).toMatchObject(row)
    })

    it('can insert more rows', async () => {
      await ds.testInsert(row)

      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      }
      const result = await ds.testInsert([newRow1, newRow2])
      expect(result).toContainEqual(newRow1)
      expect(result).toContainEqual(newRow2)
    })

    it('can update rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testUpdate({
        code: 'NEW CODE',
      }, {
        where: {
          id: newRow1.id,
        }
      })

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({
        ...newRow1,
        code: 'NEW CODE'
      })
    })

    it('can delete rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.testDelete({
        where: {
          id: newRow1.id,
        },
        expected: 'one'
      })

      expect(result).toMatchObject(newRow1)

      const remaining = await ds.get()
      expect(remaining).toHaveLength(1)
      expect(remaining).toContainEqual(newRow2)
    })

    it('can use loaders to lookup rows', async () => {
      const newRow1 = {
        id: 10,
        code: 'any',
        name: 'any',
        with_default: 'asdf',
      }
      const newRow2 = {
        id: 11,
        code: 'more',
        name: 'values',
        with_default: 'asdf',
      }

      await ds.testInsert([newRow1, newRow2])

      const result = await ds.idLoader.load(newRow1.id)
      expect(result).toMatchObject(newRow1)
    })
  })
})
