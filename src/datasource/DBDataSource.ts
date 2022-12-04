import { camel, snake } from 'case'
import DataLoader from 'dataloader'
import {
  sql,
  DatabasePool,
  TaggedTemplateLiteralInvocation,
  IdentifierNormalizer,
  DatabaseTransactionConnection,
} from 'slonik'

export type { DatabasePool } from 'slonik'

import { FinderFactory, LoaderFactory } from './loaders'
import QueryBuilder, {
  QueryOptions as BuilderOptions,
  SelectOptions,
} from './queries/QueryBuilder'
import {
  AllowSql,
  CountQueryRowType,
  UpdateSet,
  ValueOrArray,
} from './queries/types'
import { AsyncLocalStorage } from 'async_hooks'
import type { ZodSchema } from 'zod'
import { isSqlToken } from './queries/utils'

export interface QueryOptions<TRowType, TResultType = TRowType>
  extends BuilderOptions<TRowType> {
  eachResult?: LoaderCallback<TResultType>
  expected?: 'one' | 'many' | 'maybeOne' | 'any'
}

export interface KeyNormalizers {
  keyToColumn: IdentifierNormalizer
  columnToKey: IdentifierNormalizer
}

export { DataLoader, sql }

export type LoaderCallback<TResultType> = (
  value: TResultType,
  index: number,
  array: readonly TResultType[]
) => void

const parseTS = (value: number | string): Date | null =>
  value === null ? null : new Date(value)

const isArray = <T extends unknown[] | readonly unknown[], U>(
  value: T | U
): value is T => Array.isArray(value)

interface AsyncStorage<TRowType> {
  transaction: DatabaseTransactionConnection
  loaderLookups: Array<[Loader<TRowType>, readonly unknown[]]>
}

type Loader<TRowType> = DataLoader<unknown, TRowType[] | (TRowType | undefined)>

interface ExtendedDatabasePool<TRowType> extends DatabasePool {
  async: AsyncLocalStorage<AsyncStorage<TRowType>>
}

export default class DBDataSource<
  TRowType,
  TInsertType extends { [K in keyof TRowType]?: unknown } = TRowType,
  TColumnTypes extends Record<keyof TRowType, string> = Record<
    keyof TRowType,
    string
  >
> {
  protected normalizers: KeyNormalizers = {
    columnToKey: camel,
    keyToColumn: snake,
  }

  protected defaultOptions: QueryOptions<TRowType> = {}

  private _loaders?: LoaderFactory<TRowType>
  protected get loaders(): LoaderFactory<TRowType> {
    if (!this._loaders) {
      this._loaders = new LoaderFactory(
        this.getDataByColumn.bind(this),
        this.getDataByMultipleColumns.bind(this),
        {
          ...this.normalizers,
          columnTypes: this.columnTypes,
        }
      )
    }

    return this._loaders
  }

  private _finders?: FinderFactory<TRowType>
  protected get finders(): FinderFactory<TRowType> {
    if (!this._finders) {
      this._finders = new FinderFactory()
    }

    return this._finders
  }

  private _builder?: QueryBuilder<TRowType, TInsertType>
  protected get builder(): QueryBuilder<TRowType, TInsertType> {
    if (!this._builder) {
      this._builder = new QueryBuilder(
        this.table,
        this.columnTypes,
        this.normalizers.keyToColumn,
        this.defaultOptions
      )
    }

    return this._builder
  }

  protected readonly pool: ExtendedDatabasePool<TRowType>

  constructor(
    pool: DatabasePool,
    protected readonly table: string,
    /**
     * Types of the columns in the database.
     * Used to map values for insert and lookups on multiple values.
     *
     * EVERY DATASOURCE MUST PROVIDE THIS AS STUFF WILL BREAK OTHERWISE. SORRY.
     */
    protected readonly columnTypes: TColumnTypes,
    protected readonly columnSchemas?: {
      [K in keyof TRowType as TColumnTypes[K] extends 'json' | 'jsonb'
        ? K
        : never]?: ZodSchema
    }
  ) {
    this.pool = pool as ExtendedDatabasePool<TRowType>
    this.pool.async ||= new AsyncLocalStorage()
  }

  protected get connection(): DatabasePool | DatabaseTransactionConnection {
    const store = this.pool.async.getStore()
    return store?.transaction || this.pool
  }

  public async transaction<T>(
    callback: () => Promise<T>,
    transactionRetryLimit?: number
  ): Promise<T> {
    return await this.connection.transaction<T>((connection) => {
      return this.pool.async.run(
        {
          transaction: connection,
          loaderLookups: [],
        },
        async () => {
          try {
            return await callback()
          } catch (error) {
            const store = this.pool.async.getStore()
            if (store) {
              store.loaderLookups.forEach(([loader, args]) => {
                args.forEach((key) => {
                  loader.clear(key)
                })
              })
            }
            throw error
          }
        }
      )
    }, transactionRetryLimit)
  }

  /**
   * Find a single row
   *
   * @param options Query options
   */
  protected async get(
    options: QueryOptions<TRowType> & SelectOptions & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Possibly find a single row
   *
   * @param options Query options
   */
  protected async get(
    options: QueryOptions<TRowType> & SelectOptions & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Find multiple rows
   *
   * @param options Query options
   */
  protected async get(
    options?: QueryOptions<TRowType> &
      SelectOptions & { expected?: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  protected async get(
    options?: QueryOptions<TRowType> & SelectOptions
  ): Promise<TRowType | readonly TRowType[] | null> {
    const query = this.builder.select(options)

    return await this.query(query, options)
  }

  protected async count(
    options?: Omit<
      QueryOptions<TRowType, CountQueryRowType>,
      'expected' | 'orderBy' | 'groupBy' | 'limit' | 'having'
    >
  ): Promise<number> {
    const query = this.builder.count(options)
    const result = await this.query(query, {
      ...options,
      expected: 'one',
    })
    return result.count
  }

  protected async countGroup<TGroup extends Array<string & keyof TRowType>>(
    groupColumns: TGroup & Array<keyof TRowType>,
    options?: Omit<
      QueryOptions<CountQueryRowType & { [K in TGroup[0]]: TRowType[K] }>,
      'orderBy' | 'groupBy' | 'limit' | 'having' | 'expected'
    >
  ): Promise<
    ReadonlyArray<CountQueryRowType & { [K in TGroup[0]]: TRowType[K] }>
  > {
    const query = this.builder.countGroup(groupColumns, options)
    const result = await this.query(query, {
      ...options,
      expected: 'any',
    })
    return result
  }

  /**
   * Insert a single row
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: AllowSql<TInsertType>,
    options?: QueryOptions<TRowType> & { expected?: undefined }
  ): Promise<TRowType>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: Array<AllowSql<TInsertType>>,
    options?: QueryOptions<TRowType> & { expected?: undefined }
  ): Promise<readonly TRowType[]>

  /**
   * Expect a single row to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<TInsertType>>,
    options?: QueryOptions<TRowType> & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Expect zero or one rows to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<TInsertType>>,
    options?: QueryOptions<TRowType> & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<TInsertType>>,
    options?: QueryOptions<TRowType> & { expected: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  /**
   * Implementation
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<TInsertType>>,
    options: QueryOptions<TRowType> = {}
  ): Promise<TRowType | readonly TRowType[] | null> {
    if (!options.expected) {
      options.expected = !isArray(rows) ? 'one' : 'many'
    }

    if (isArray(rows) && rows.length === 0) {
      switch (options.expected) {
        case 'one': // we should really raise here, strictly speaking
        case 'maybeOne':
          return null
        case 'many': // we should really raise here, strictly speaking
        case 'any':
          return []
      }
    }

    if (isArray(rows)) {
      rows.map((row) => this.parseColumnSchemas(row))
    } else {
      rows = this.parseColumnSchemas(rows)
    }

    const query = this.builder.insert(rows, options)
    return await this.query(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<TRowType>,
    options: QueryOptions<TRowType> & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<TRowType>,
    options: QueryOptions<TRowType> & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<TRowType>,
    options?: QueryOptions<TRowType> & { expected?: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  /**
   * Implementation
   */
  protected async update(
    data: UpdateSet<TRowType>,
    options?: QueryOptions<TRowType>
  ): Promise<TRowType | readonly TRowType[] | null> {
    data = this.parseColumnSchemas(data)
    const query = this.builder.update(data, options)
    return await this.query(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<TRowType> & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<TRowType> & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<TRowType> & { expected?: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  /**
   * Delete every row in the table
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(options: true): Promise<readonly TRowType[]>

  /**
   * Implementation
   */
  protected async delete(
    options: QueryOptions<TRowType> | true
  ): Promise<TRowType | readonly TRowType[] | null> {
    const query = this.builder.delete(options)
    return await this.query(query, options === true ? undefined : options)
  }

  /**
   * Perform a query. Ideally all queries should go through this.
   *
   * This mainly exists to get around TypeScript complaining that the invocation
   * expressions of the different execution functions (any, one, etc.) aren't
   * compatible. They are, of course, but I guess type inference can't overcome
   * the barrier of variable key-based lookup, rather than explicit calls.
   *
   * @param query Executable query
   * @param options Query options
   */
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options: QueryOptions<TData> & { expected?: 'any' | 'many' }
  ): Promise<readonly TData[]>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options: QueryOptions<TData> & { expected: 'one' }
  ): Promise<TData>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options: QueryOptions<TData> & { expected: 'maybeOne' }
  ): Promise<TData | null>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null | readonly TData[]>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null | readonly TData[]> {
    switch (options?.expected || 'any') {
      case 'one':
        return await this.one(query, options)
      case 'maybeOne':
        return await this.maybeOne(query, options)
      case 'many':
        return await this.many(query, options)
      case 'any':
        return await this.any(query, options)
    }
  }

  private async any<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = (await this.connection.any(query)).map((row) =>
      this.transformResult<TData, TData>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async many<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = (await this.connection.many(query)).map((row) =>
      this.transformResult<TData, TData>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async one<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData> {
    const result = this.transformResult<TData, TData>(
      await this.connection.one(query)
    )
    this.eachResult(result, options)
    return result
  }

  private async maybeOne<TData>(
    query: TaggedTemplateLiteralInvocation<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null> {
    let result = await this.connection.maybeOne(query)
    if (result) {
      result = this.transformResult(result)
    }
    this.eachResult(result, options)
    return result

    AsyncLocalStorage
  }

  private eachResult<TData>(
    results: TData | null | ReadonlyArray<TData | null>,
    { eachResult }: QueryOptions<TData> = {}
  ): void {
    if (!eachResult) {
      return
    }

    if (!isArray(results)) {
      results = [results]
    }

    results.filter((val): val is TData => val !== null).forEach(eachResult)
  }

  private async getDataByColumn<TColumnName extends keyof TRowType & string>(
    args: ReadonlyArray<TRowType[TColumnName]>,
    column: TColumnName,
    type: string,
    loader: DataLoader<
      TRowType[TColumnName] & (string | number),
      TRowType[] | TRowType | undefined
    >,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<readonly TRowType[]> {
    const store = this.pool.async.getStore()
    if (store) {
      store.loaderLookups.push([loader, args])
    }

    return await this.get({
      ...options,
      expected: 'any',
      where: {
        [column]: sql`= ${this.builder.any(
          [...args] as unknown as (string | number | boolean | Date | null)[],
          type
        )}`,
        ...options?.where,
      },
    })
  }

  protected async getDataByMultipleColumns<
    TColumnNames extends Array<keyof TRowType & string>,
    TArgs extends { [K in TColumnNames[0]]: TRowType[K] }
  >(
    args: ReadonlyArray<TArgs>,
    columns: TColumnNames,
    types: string[],
    loader: DataLoader<TArgs, TRowType[] | TRowType | undefined>,
    options?: QueryOptions<TRowType> & SelectOptions
  ): Promise<readonly TRowType[]> {
    const store = this.pool.async.getStore()
    if (store) {
      store.loaderLookups.push([loader, args])
    }

    return await this.query(
      this.builder.multiColumnBatchGet(args, columns, types, options),
      { expected: 'any' }
    )
  }

  protected parseColumnSchemas<TRow extends AllowSql<TRowType | TInsertType>>(
    row: TRow
  ): TRow {
    if (!this.columnSchemas) {
      return row
    }
    const keys = Object.keys(
      this.columnSchemas
    ) as (keyof typeof this.columnSchemas)[]
    for (const column of keys) {
      const schema = this.columnSchemas[column]
      if (!schema || isSqlToken(row[column])) {
        continue
      }

      row[column] = schema.parse(row[column])
    }
    return row
  }

  private transformResult<TInput, TOutput>(input: TInput): TOutput {
    const transform = this.normalizers.columnToKey

    const output = Object.keys(input).reduce<TOutput>((obj, key) => {
      const column = transform(key)
      const type: string | undefined =
        this.columnTypes[column as keyof TRowType]
      const value = this.mapTypeValue(
        column,
        type,
        (input as Record<string, unknown>)[key]
      )

      return {
        ...obj,
        [column]: value,
      }
    }, {} as TOutput)

    return output
  }

  protected mapTypeValue(
    _columnName: string,
    columnType: string | undefined,
    value: unknown
  ): unknown {
    switch (columnType) {
      case 'date':
      case 'timestamp':
      case 'timestamptz':
        if (typeof value === 'number' || typeof value === 'string') {
          return parseTS(value)
        }
        break
      default:
    }
    return value
  }
}
