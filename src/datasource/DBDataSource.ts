import { camel } from 'case'
import DataLoader from 'dataloader'
import { sql, DatabasePool, DatabaseTransactionConnection } from 'slonik'

export type { DatabasePool } from 'slonik'

import { FinderFactory, LoaderFactory } from './loaders'
import QueryBuilder, { SelectOptions } from './queries/QueryBuilder'
import { CountQueryRowType, ValueOrArray } from './queries/types'
import { AsyncLocalStorage } from 'async_hooks'
import { z } from 'zod'
import { TypedSqlQuery } from '../types'
import { ExtendedDatabasePool, QueryOptions, TableInfo } from './types'

export { DataLoader, sql }

const parseTS = (value: number | string): Date | null =>
  value === null ? null : new Date(value)

export default class DBDataSource<Info extends TableInfo> {
  protected normalizers = {
    columnToKey: camel,
  } as const

  public static defaultSymbol = Symbol('DEFAULT')

  protected defaultOptions: QueryOptions<z.infer<Info['schemas']['select']>> =
    {}

  private _loaders?: LoaderFactory<z.infer<Info['schemas']['select']>>
  protected get loaders(): LoaderFactory<z.infer<Info['schemas']['select']>> {
    if (!this._loaders) {
      this._loaders = new LoaderFactory(
        this.getDataByColumn.bind(this),
        this.getDataByMultipleColumns.bind(this),
        this.info.metadata
      )
    }

    return this._loaders
  }

  private _finders?: FinderFactory<z.infer<Info['schemas']['select']>>
  protected get finders(): FinderFactory<z.infer<Info['schemas']['select']>> {
    if (!this._finders) {
      this._finders = new FinderFactory()
    }

    return this._finders
  }

  private _builder?: QueryBuilder<Info>
  protected get builder(): QueryBuilder<Info> {
    if (!this._builder) {
      this._builder = new QueryBuilder(
        this.info,
        this.defaultOptions,
        DBDataSource.defaultSymbol
      )
    }

    return this._builder
  }

  protected readonly pool: ExtendedDatabasePool<
    z.infer<Info['schemas']['select']>
  >

  constructor(pool: DatabasePool, protected readonly info: Info) {
    this.pool = pool as ExtendedDatabasePool<z.infer<Info['schemas']['select']>>
    this.pool.async ||= new AsyncLocalStorage()
  }

  public get table(): string {
    return this.info.name
  }

  protected get metadata(): Info['metadata'] {
    return this.info.metadata
  }

  protected get selectSchema(): Info['schemas']['select'] {
    return this.info.schemas.select
  }

  protected get insertSchema(): Info['schemas']['insert'] {
    return this.info.schemas.insert
  }

  protected get updateSchema(): Info['schemas']['update'] {
    return this.info.schemas.update
  }

  protected get default(): symbol {
    return DBDataSource.defaultSymbol
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
    options: QueryOptions<z.infer<Info['schemas']['select']>> &
      SelectOptions & { expected: 'one' }
  ): Promise<z.infer<Info['schemas']['select']>>

  /**
   * Possibly find a single row
   *
   * @param options Query options
   */
  protected async get(
    options: QueryOptions<z.infer<Info['schemas']['select']>> &
      SelectOptions & { expected: 'maybeOne' }
  ): Promise<z.infer<Info['schemas']['select']> | null>

  /**
   * Find multiple rows
   *
   * @param options Query options
   */
  protected async get(
    options?: QueryOptions<z.infer<Info['schemas']['select']>> &
      SelectOptions & { expected?: 'any' | 'many' }
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  protected async get(
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & SelectOptions
  ): Promise<
    | z.infer<Info['schemas']['select']>
    | readonly z.infer<Info['schemas']['select']>[]
    | null
  > {
    const query = this.builder.select(options)

    return await this.query<Info['schemas']['select']>(query, options)
  }

  protected async count(
    options?: Omit<
      QueryOptions<z.infer<Info['schemas']['select']>, CountQueryRowType>,
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

  protected async countGroup<
    TGroup extends Array<string & keyof z.infer<Info['schemas']['select']>>
  >(
    groupColumns: TGroup & Array<keyof z.infer<Info['schemas']['select']>>,
    options?: Omit<
      QueryOptions<
        CountQueryRowType & {
          [K in TGroup[0]]: z.infer<Info['schemas']['select']>[K]
        }
      >,
      'orderBy' | 'groupBy' | 'limit' | 'having' | 'expected'
    >
  ): Promise<
    ReadonlyArray<
      CountQueryRowType & {
        [K in TGroup[0]]: z.infer<Info['schemas']['select']>[K]
      }
    >
  > {
    const query = this.builder.countGroup(groupColumns, options)
    const parser = query.parser
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore i promise
    const result = await this.query<z.infer<typeof parser>>(query, {
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
    rows: z.infer<Info['schemas']['insert']>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected?: undefined
    }
  ): Promise<z.infer<Info['schemas']['select']>>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: Array<z.infer<Info['schemas']['insert']>>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected?: undefined
    }
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  /**
   * Expect a single row to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<z.infer<Info['schemas']['insert']>>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'one'
    }
  ): Promise<z.infer<Info['schemas']['select']>>

  /**
   * Expect zero or one rows to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<z.infer<Info['schemas']['insert']>>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'maybeOne'
    }
  ): Promise<z.infer<Info['schemas']['select']> | null>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<z.infer<Info['schemas']['insert']>>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'any' | 'many'
    }
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  /**
   * Implementation
   */
  protected async insert(
    rows: ValueOrArray<z.infer<Info['schemas']['insert']>>,
    options: QueryOptions<z.infer<Info['schemas']['select']>> = {}
  ): Promise<
    | z.infer<Info['schemas']['select']>
    | readonly z.infer<Info['schemas']['select']>[]
    | null
  > {
    options.expected ||= !Array.isArray(rows) ? 'one' : 'many'

    if (Array.isArray(rows) && rows.length === 0) {
      switch (options.expected) {
        case 'one': // we should really raise here, strictly speaking
        case 'maybeOne':
          return null
        case 'many': // we should really raise here, strictly speaking
        case 'any':
          return []
      }
    }
    rows = Array.isArray(rows) ? rows : [rows]
    rows = rows.map((row: z.infer<Info['schemas']['insert']>) =>
      this.insertSchema.parse(row)
    ) as z.infer<Info['schemas']['insert']>[]

    const query = this.builder.insert(rows, options)
    return await this.query<Info['schemas']['select']>(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: z.infer<Info['schemas']['update']>,
    options: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'one'
    }
  ): Promise<z.infer<Info['schemas']['select']>>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: z.infer<Info['schemas']['update']>,
    options: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'maybeOne'
    }
  ): Promise<z.infer<Info['schemas']['select']> | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: z.infer<Info['schemas']['update']>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected?: 'any' | 'many'
    }
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  /**
   * Implementation
   */
  protected async update(
    data: z.infer<Info['schemas']['update']>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ): Promise<
    | z.infer<Info['schemas']['select']>
    | readonly z.infer<Info['schemas']['select']>[]
    | null
  > {
    const query = this.builder.update(this.updateSchema.parse(data), options)
    return await this.query<Info['schemas']['select']>(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'one'
    }
  ): Promise<z.infer<Info['schemas']['select']>>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected: 'maybeOne'
    }
  ): Promise<z.infer<Info['schemas']['select']> | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<Info['schemas']['select']>> & {
      expected?: 'any' | 'many'
    }
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  /**
   * Delete every row in the table
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: true
  ): Promise<readonly z.infer<Info['schemas']['select']>[]>

  /**
   * Implementation
   */
  protected async delete(
    options: QueryOptions<z.infer<Info['schemas']['select']>> | true
  ): Promise<
    | z.infer<Info['schemas']['select']>
    | readonly z.infer<Info['schemas']['select']>[]
    | null
  > {
    const query = this.builder.delete(options)
    return await this.query<Info['schemas']['select']>(
      query,
      options === true ? undefined : options
    )
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
  protected async query<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected?: 'any' | 'many' }
  ): Promise<readonly z.infer<TData>[]>
  protected async query<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected: 'one' }
  ): Promise<z.infer<TData>>
  protected async query<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected: 'maybeOne' }
  ): Promise<z.infer<TData> | null>
  protected async query<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData> | null | readonly z.infer<TData>[]>
  protected async query<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData> | null | readonly z.infer<TData>[]> {
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

  private async any<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<readonly z.infer<TData>[]> {
    const results = (await this.connection.any(query)).map((row) =>
      this.transformResult<z.infer<TData>, z.infer<TData>>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async many<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<readonly z.infer<TData>[]> {
    const results = (await this.connection.many(query)).map((row) =>
      this.transformResult<z.infer<TData>, z.infer<TData>>(row)
    )
    this.eachResult<z.infer<TData>>(results, options)
    return results
  }

  private async one<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData>> {
    const result = this.transformResult<z.infer<TData>, z.infer<TData>>(
      await this.connection.one(query)
    )
    this.eachResult(result, options)
    return result
  }

  private async maybeOne<TData extends z.ZodTypeAny>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData> | null> {
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
    const arrayResults = Array.isArray(results) ? results : [results]
    arrayResults.filter((val): val is TData => val !== null).forEach(eachResult)
  }

  private async getDataByColumn<
    TColumnName extends keyof z.infer<Info['schemas']['select']> & string
  >(
    args: ReadonlyArray<z.infer<Info['schemas']['select']>[TColumnName]>,
    column: TColumnName,
    type: string,
    loader: DataLoader<
      z.infer<Info['schemas']['select']>[TColumnName] & (string | number),
      | z.infer<Info['schemas']['select']>[]
      | z.infer<Info['schemas']['select']>
      | undefined
    >,
    options?: Omit<QueryOptions<z.infer<Info['schemas']['select']>>, 'expected'>
  ): Promise<readonly z.infer<Info['schemas']['select']>[]> {
    const store = this.pool.async.getStore()
    if (store) {
      store.loaderLookups.push([loader, args])
    }

    return await this.get({
      ...options,
      expected: 'any',
      where: {
        [column]: sql.fragment`= ${this.builder.any(
          [...args] as unknown as (string | number | boolean | Date | null)[],
          type
        )}`,
        ...options?.where,
      },
    })
  }

  protected async getDataByMultipleColumns<
    TColumnNames extends Array<
      keyof z.infer<Info['schemas']['select']> & string
    >,
    TArgs extends {
      [K in TColumnNames[0]]: z.infer<Info['schemas']['select']>[K]
    }
  >(
    args: ReadonlyArray<TArgs>,
    columns: TColumnNames,
    types: string[],
    loader: DataLoader<
      TArgs,
      | z.infer<Info['schemas']['select']>[]
      | z.infer<Info['schemas']['select']>
      | undefined
    >,
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & SelectOptions
  ): Promise<readonly z.infer<Info['schemas']['select']>[]> {
    const store = this.pool.async.getStore()
    if (store) {
      store.loaderLookups.push([loader, args])
    }

    return await this.query(
      this.builder.multiColumnBatchGet(args, columns, types, options),
      { expected: 'any' }
    )
  }

  private transformResult<TInput extends object, TOutput>(
    input: TInput
  ): TOutput {
    const transform = this.normalizers.columnToKey

    const output = Object.keys(input).reduce<TOutput>((obj, key) => {
      const column = transform(key)
      const type: string | undefined =
        this.metadata[column as keyof z.infer<Info['schemas']['select']>]
          ?.nativeType
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
