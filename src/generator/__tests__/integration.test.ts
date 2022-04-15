import assert from 'assert'
import { createPool, DatabasePool, sql } from 'slonik'
import { raw } from 'slonik-sql-tag-raw'
import { Generator } from '..'
import { SchemaInfo } from '../database'

let pool: DatabasePool
let instance: Generator

const SCHEMA = 'generator'

beforeAll(async () => {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured')

  pool = createPool(process.env.DATABASE_URL, {
    captureStackTrace: true,
    maximumPoolSize: 1,
    idleTimeout: 'DISABLE_TIMEOUT',
    idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
  })

  await pool.query(sql`CREATE SCHEMA ${sql.identifier([SCHEMA])}`)
  await pool.query(sql`SET search_path TO ${raw(SCHEMA)}`)

  await pool.query(sql`
    CREATE TYPE "test_type_enum" AS ENUM (
      'aa',
      'bb',
      'zzzz',
      'cc'
    )
  `)
  await pool.query(sql`
    CREATE DOMAIN "test_type_domain" AS text
  `)
  await pool.query(sql`
    CREATE TABLE "test_table_standard" (
      id SERIAL NOT NULL,
      arr_test TEXT[],
      domain_test TEST_TYPE_DOMAIN,
      enum_test TEST_TYPE_ENUM NOT NULL,
      enum_arr_test TEST_TYPE_ENUM[],
      jsonb_test JSONB,
      "casetest_lower" TEXT,
      "caseTest_upper" TEXT
    )
  `)
  await pool.query(sql`
    CREATE TABLE "test_table_types" (
      id UUID NOT NULL,
      table_test TEST_TABLE_STANDARD,
      table_arr_test TEST_TABLE_STANDARD[] DEFAULT '{}' NOT NULL
    )
  `)
  await pool.query(sql`
    CREATE TABLE "test_table_order" (
      subsequent_table_type TEST_TABLE_STANDARD
    )
  `)
})

afterAll(async () => {
  await instance.destroy()
})

beforeEach(() => {
  instance = new Generator({
    schema: new SchemaInfo(pool, SCHEMA),
  })
})

describe('Generator', () => {
  it('generates the correct types', async () => {
    expect(await instance.build()).toMatchSnapshot()
  })
})
