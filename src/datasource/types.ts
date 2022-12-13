import { AsyncLocalStorage } from 'async_hooks'
import DataLoader from 'dataloader'
import {
  DatabasePool,
  DatabaseTransactionConnection,
  IdentifierNormalizer,
} from 'slonik'
import { z } from 'zod'

import { QueryOptions as BuilderOptions } from './queries/QueryBuilder'

export interface QueryOptions<Schema, TResultType = Schema>
  extends BuilderOptions<Schema> {
  eachResult?: LoaderCallback<TResultType>
  expected?: 'one' | 'many' | 'maybeOne' | 'any'
  defaultSymbol?: symbol
}

export interface KeyNormalizers {
  keyToColumn: IdentifierNormalizer
  columnToKey: IdentifierNormalizer
}
export type LoaderCallback<TResultType> = (
  value: TResultType,
  index: number,
  array: readonly TResultType[]
) => void

interface AsyncStorage<Schema> {
  transaction: DatabaseTransactionConnection
  loaderLookups: Array<[Loader<Schema>, readonly unknown[]]>
}

type Loader<Schema> = DataLoader<unknown, Schema[] | (Schema | undefined)>

export interface ExtendedDatabasePool<Schema> extends DatabasePool {
  async: AsyncLocalStorage<AsyncStorage<Schema>>
}

export type TableSchema<TableColumns extends string> = z.ZodObject<{
  [K in string & TableColumns]: z.ZodTypeAny
}>
export type ColumnMetadata = {
  nativeName: string
  nativeType: string
}
export type TableMetadata<ColumnNames extends string = string> = {
  [K in string & ColumnNames]: ColumnMetadata
}

export type TableInfo<ColumnNames extends string = string> = {
  name: string
  metadata: TableMetadata<ColumnNames>
  schemas: {
    select: TableSchema<ColumnNames>
    insert: TableSchema<ColumnNames>
    update: TableSchema<ColumnNames>
  }
}
