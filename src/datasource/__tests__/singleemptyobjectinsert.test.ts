import assert from 'assert'
import { createPool, DatabasePool, sql } from 'slonik'
import { z } from 'zod'

import { DBDataSource } from '..'

const DummyMetadata = {
  id: {
    nativeType: 'int8',
    nativeName: 'id',
  },
}

const Dummy$SelectSchema = z.object({
  id: z.number(),
})

const Dummy$InsertSchema = z.object({
  id: z.number().optional(),
})

let pool: DatabasePool

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
      CREATE TABLE IF NOT EXISTS "empty_object_test_table" (
        "id" SERIAL PRIMARY KEY
      )
    `)
  })
})

class TestDataSource extends DBDataSource<{
  name: 'empty_object_test_table'
  metadata: typeof DummyMetadata
  schemas: {
    select: z.ZodObject<
      typeof Dummy$SelectSchema['shape'],
      'strip',
      z.ZodTypeAny
    >
    insert: z.ZodObject<
      typeof Dummy$InsertSchema['shape'],
      'strip',
      z.ZodTypeAny
    >
    update: z.ZodObject<{
      [k in keyof typeof Dummy$InsertSchema['shape']]: z.ZodOptional<
        typeof Dummy$InsertSchema['shape'][k]
      >
    }>
  }
}> {
  constructor() {
    const schema$select = Dummy$SelectSchema
    const schema$insert = Dummy$InsertSchema

    super(pool, {
      name: 'empty_object_test_table',
      metadata: DummyMetadata,
      schemas: {
        select: schema$select,
        insert: schema$insert,
        update: schema$insert.partial(),
      },
    })
  }

  public idLoader = this.loaders.create('id')

  // these functions are protected, so we're not normally able to access them
  public testInsert: TestDataSource['insert'] = this.insert
}

let ds: TestDataSource

beforeEach(() => {
  ds = new TestDataSource()
})

afterEach(async () => {
  await pool.query(sql.unsafe`TRUNCATE empty_object_test_table`)
})

afterAll(async () => {
  await pool.end()
})

describe('DBDataSource', () => {
  it('can insert row with no column specified', async () => {
    const result = await ds.testInsert({})
    expect(result).toMatchObject({ id: expect.any(Number) })
  })
})
