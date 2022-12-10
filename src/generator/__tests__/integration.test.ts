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

  pool = await createPool(process.env.DATABASE_URL, {
    captureStackTrace: true,
    maximumPoolSize: 1,
    idleTimeout: 'DISABLE_TIMEOUT',
    idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
  })

  await pool.query(sql.unsafe`CREATE SCHEMA ${sql.identifier([SCHEMA])}`)
  await pool.query(sql.unsafe`SET search_path TO ${raw(SCHEMA)}`)

  await pool.query(sql.unsafe`
    CREATE TYPE "test_type_enum" AS ENUM (
      'aa',
      'bb',
      'zzzz',
      'cc'
    )
  `)
  await pool.query(sql.unsafe`
    CREATE DOMAIN "test_type_domain" AS text
  `)
  await pool.query(sql.unsafe`
    CREATE TABLE "test_table_standard" (
      id SERIAL NOT NULL,
      arr_test TEXT[],
      domain_test TEST_TYPE_DOMAIN,
      enum_test TEST_TYPE_ENUM NOT NULL,
      enum_arr_test TEST_TYPE_ENUM[],
      jsonb_test JSONB,
      "casetest_lower" TEXT,
      "caseTest_upper" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(sql.unsafe`
    CREATE TABLE "test_table_types" (
      id UUID NOT NULL,
      table_test TEST_TABLE_STANDARD,
      table_arr_test TEST_TABLE_STANDARD[] DEFAULT '{}' NOT NULL
    )
  `)
  await pool.query(sql.unsafe`
    CREATE TABLE "test_table_order" (
      subsequent_table_type TEST_TABLE_STANDARD
    )
  `)
  await pool.query(sql.unsafe`
    CREATE TABLE "test_generation_defaults" (
      generated_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
      generated_column INTEGER NOT NULL
        GENERATED ALWAYS AS (generated_id + 1) STORED
    )
  `)
})

afterAll(async () => {
  await instance.destroy()
})

beforeEach(() => {
  instance = new Generator({
    schema: new SchemaInfo(pool, SCHEMA),
    genInsertSchemas: true,
    genSelectSchemas: true,
    genTableMetadata: true,
    genEnums: true,
    genInsertTypes: true,
    genSchemaObjects: true,
    genTables: true,
    genTypeObjects: true,
  })
})

describe('Generator', () => {
  it('generates the correct types', async () => {
    expect(await instance.build()).toMatchSnapshot()
  })
})
