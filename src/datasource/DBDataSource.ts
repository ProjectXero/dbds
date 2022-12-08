import { camel } from 'case'
import DataLoader from 'dataloader'
import { sql, DatabasePool, DatabaseTransactionConnection } from 'slonik'

export type { DatabasePool } from 'slonik'

import { FinderFactory, LoaderFactory } from './loaders'
import QueryBuilder, { SelectOptions } from './queries/QueryBuilder'
import {
  AllowSql,
  CountQueryRowType,
  UpdateSet,
  ValueOrArray,
} from './queries/types'
import { AsyncLocalStorage } from 'async_hooks'
import { z } from 'zod'
import { TypedSqlQuery } from '../types'
import {
  ExtendedDatabasePool,
  QueryOptions,
  TableMetadata,
  TableSchema,
} from './types'

export { DataLoader, sql }

const parseTS = (value: number | string): Date | null =>
  value === null ? null : new Date(value)

// class NewDBDataSource<
//   Metadata extends TableMetadata,
//   SelectSchema extends TableSchema<string & keyof Metadata>,
//   InsertSchema extends TableSchema<string & keyof Metadata>
// > {
//   constructor(
//     pool: DatabasePool,
//     protected readonly table: string,
//     protected readonly metadata: Metadata,
//     protected readonly selectSchema: SelectSchema,
//     protected readonly insertSchema: InsertSchema
//   ) {
//     this.pool = pool as ExtendedDatabasePool<SelectSchema>
//     this.pool.async ||= new AsyncLocalStorage()
//   }

//   protected defaultOptions: QueryOptions<z.infer<SelectSchema>> = {}
//   protected readonly pool: ExtendedDatabasePool<SelectSchema>

//   private _loaderFactory?: LoaderFactory<z.infer<SelectSchema>>
//   protected get loaderFactory(): LoaderFactory<z.infer<SelectSchema>> {
//     this._loaderFactory ||= new LoaderFactory(
//       this.getDataByColumn.bind(this),
//       this.getDataByMultipleColumns.bind(this),
//       {
//         ...this.normalizers,
//         columnTypes: this.columnTypes,
//       }
//     )

//     return this._loaderFactory
//   }

//   private finderFactory?: FinderFactory<z.infer<SelectSchema>>
//   protected get finders(): FinderFactory<z.infer<SelectSchema>> {
//     this.finderFactory ||= new FinderFactory()
//     return this.finderFactory
//   }

//   private _queryBuilder?: QueryBuilder<Metadata, SelectSchema>
//   protected get queryBuilder(): QueryBuilder<Metadata, SelectSchema> {
//     if (!this._queryBuilder) {
//       this._queryBuilder = new QueryBuilder<Metadata, SelectSchema>(
//         this.table,
//         this.metadata,
//         this.selectSchema,
//         this.defaultOptions
//       )
//     }

//     return this._queryBuilder
//   }

//   protected async getDataByMultipleColumns<
//     TColumnNames extends Array<string & keyof z.infer<SelectSchema>>,
//     TArgs extends { [K in TColumnNames[0]]: z.infer<SelectSchema>[K] }
//   >(
//     args: ReadonlyArray<TArgs>,
//     columns: TColumnNames,
//     types: string[],
//     loader: DataLoader<
//       TArgs,
//       z.infer<SelectSchema>[] | z.infer<SelectSchema> | undefined
//     >,
//     options?: QueryOptions<z.infer<SelectSchema>> & SelectOptions
//   ): Promise<readonly z.infer<SelectSchema>[]> {
//     const store = this.pool.async.getStore()
//     if (store) {
//       store.loaderLookups.push([loader, args])
//     }

//     return await this.query(
//       this.queryBuilder.multiColumnBatchGet(args, columns, types, options),
//       { expected: 'any' }
//     )
//   }
// }

// const DEFAULT = Symbol('DEFAULT')

// const BlahSchema = z.object({
//   id: z.string(),
//   name: z.string(),
// })

// const BlahMetadata: TableMetadata<'id' | 'name'> = {
//   id: {
//     nativeName: 'id',
//     nativeType: 'int8',
//   },
//   name: {
//     nativeName: 'name',
//     nativeType: 'text',
//   },
// }

// const ds = new NewDBDataSource(BlahMetadata, BlahSchema, BlahSchema)

export default class DBDataSource<
  Metadata extends TableMetadata,
  SelectSchema extends TableSchema<string & keyof Metadata>,
  InsertSchema extends TableSchema<string & keyof Metadata>
> {
  protected normalizers = {
    columnToKey: camel,
  } as const

  protected defaultOptions: QueryOptions<z.infer<SelectSchema>> = {}

  private _loaders?: LoaderFactory<z.infer<SelectSchema>>
  protected get loaders(): LoaderFactory<z.infer<SelectSchema>> {
    if (!this._loaders) {
      this._loaders = new LoaderFactory(
        this.getDataByColumn.bind(this),
        this.getDataByMultipleColumns.bind(this),
        this.metadata
      )
    }

    return this._loaders
  }

  private _finders?: FinderFactory<z.infer<SelectSchema>>
  protected get finders(): FinderFactory<z.infer<SelectSchema>> {
    if (!this._finders) {
      this._finders = new FinderFactory()
    }

    return this._finders
  }

  private _builder?: QueryBuilder<Metadata, SelectSchema>
  protected get builder(): QueryBuilder<Metadata, SelectSchema> {
    if (!this._builder) {
      this._builder = new QueryBuilder(
        this.table,
        this.metadata,
        this.selectSchema,
        this.defaultOptions
      )
    }

    return this._builder
  }

  protected readonly pool: ExtendedDatabasePool<z.infer<SelectSchema>>

  constructor(
    pool: DatabasePool,
    protected readonly table: string,
    protected readonly metadata: Metadata,
    protected readonly selectSchema: SelectSchema,
    protected readonly insertSchema: InsertSchema
  ) {
    this.pool = pool as ExtendedDatabasePool<z.infer<SelectSchema>>
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
    options: QueryOptions<z.infer<SelectSchema>> &
      SelectOptions & { expected: 'one' }
  ): Promise<z.infer<SelectSchema>>

  /**
   * Possibly find a single row
   *
   * @param options Query options
   */
  protected async get(
    options: QueryOptions<z.infer<SelectSchema>> &
      SelectOptions & { expected: 'maybeOne' }
  ): Promise<z.infer<SelectSchema> | null>

  /**
   * Find multiple rows
   *
   * @param options Query options
   */
  protected async get(
    options?: QueryOptions<z.infer<SelectSchema>> &
      SelectOptions & { expected?: 'any' | 'many' }
  ): Promise<readonly z.infer<SelectSchema>[]>

  protected async get(
    options?: QueryOptions<z.infer<SelectSchema>> & SelectOptions
  ): Promise<z.infer<SelectSchema> | readonly z.infer<SelectSchema>[] | null> {
    const query = this.builder.select(options)

    return await this.query<SelectSchema>(query, options)
  }

  protected async count(
    options?: Omit<
      QueryOptions<z.infer<SelectSchema>, CountQueryRowType>,
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
    TGroup extends Array<string & keyof z.infer<SelectSchema>>
  >(
    groupColumns: TGroup & Array<keyof z.infer<SelectSchema>>,
    options?: Omit<
      QueryOptions<
        CountQueryRowType & { [K in TGroup[0]]: z.infer<SelectSchema>[K] }
      >,
      'orderBy' | 'groupBy' | 'limit' | 'having' | 'expected'
    >
  ): Promise<
    ReadonlyArray<
      CountQueryRowType & { [K in TGroup[0]]: z.infer<SelectSchema>[K] }
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
    rows: AllowSql<z.infer<InsertSchema>>,
    options?: QueryOptions<z.infer<SelectSchema>> & { expected?: undefined }
  ): Promise<z.infer<SelectSchema>>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: Array<AllowSql<z.infer<InsertSchema>>>,
    options?: QueryOptions<z.infer<SelectSchema>> & { expected?: undefined }
  ): Promise<readonly z.infer<SelectSchema>[]>

  /**
   * Expect a single row to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<z.infer<InsertSchema>>>,
    options?: QueryOptions<z.infer<SelectSchema>> & { expected: 'one' }
  ): Promise<z.infer<SelectSchema>>

  /**
   * Expect zero or one rows to be inserted from the given data
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<z.infer<InsertSchema>>>,
    options?: QueryOptions<z.infer<SelectSchema>> & { expected: 'maybeOne' }
  ): Promise<z.infer<SelectSchema> | null>

  /**
   * Insert multiple rows
   * @param rows Row data to insert
   * @param options Query options
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<z.infer<InsertSchema>>>,
    options?: QueryOptions<z.infer<SelectSchema>> & { expected: 'any' | 'many' }
  ): Promise<readonly z.infer<SelectSchema>[]>

  /**
   * Implementation
   */
  protected async insert(
    rows: ValueOrArray<AllowSql<z.infer<InsertSchema>>>,
    options: QueryOptions<z.infer<SelectSchema>> = {}
  ): Promise<z.infer<SelectSchema> | readonly z.infer<SelectSchema>[] | null> {
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
    rows = rows.map((row) => this.insertSchema.parse(row)) as AllowSql<
      z.infer<InsertSchema>
    >[]

    const query = this.builder.insert(rows, options)
    return await this.query<SelectSchema>(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<z.infer<SelectSchema>>,
    options: QueryOptions<z.infer<SelectSchema>> & { expected: 'one' }
  ): Promise<z.infer<SelectSchema>>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<z.infer<SelectSchema>>,
    options: QueryOptions<z.infer<SelectSchema>> & { expected: 'maybeOne' }
  ): Promise<z.infer<SelectSchema> | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async update(
    data: UpdateSet<z.infer<SelectSchema>>,
    options?: QueryOptions<z.infer<SelectSchema>> & {
      expected?: 'any' | 'many'
    }
  ): Promise<readonly z.infer<SelectSchema>[]>

  /**
   * Implementation
   */
  protected async update(
    data: UpdateSet<z.infer<SelectSchema>>,
    options?: QueryOptions<z.infer<SelectSchema>>
  ): Promise<z.infer<SelectSchema> | readonly z.infer<SelectSchema>[] | null> {
    const mask = Object.keys(data).reduce(
      (res, key) => ({
        ...res,
        [key]: true,
      }),
      {} as Record<keyof z.infer<SelectSchema>, true>
    )
    const query = this.builder.update(
      this.insertSchema.pick(mask).parse(data) as UpdateSet<
        z.infer<SelectSchema>
      >,
      options
    )
    return await this.query<SelectSchema>(query, options)
  }

  /**
   * Update a single row
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<SelectSchema>> & { expected: 'one' }
  ): Promise<z.infer<SelectSchema>>

  /**
   * Update a zero or one rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<SelectSchema>> & { expected: 'maybeOne' }
  ): Promise<z.infer<SelectSchema> | null>

  /**
   * Update multiple rows
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: QueryOptions<z.infer<SelectSchema>> & { expected?: 'any' | 'many' }
  ): Promise<readonly z.infer<SelectSchema>[]>

  /**
   * Delete every row in the table
   *
   * @param data Update expression
   * @param options Query options
   */
  protected async delete(
    options: true
  ): Promise<readonly z.infer<SelectSchema>[]>

  /**
   * Implementation
   */
  protected async delete(
    options: QueryOptions<z.infer<SelectSchema>> | true
  ): Promise<z.infer<SelectSchema> | readonly z.infer<SelectSchema>[] | null> {
    const query = this.builder.delete(options)
    return await this.query<SelectSchema>(
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
  protected async query<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected?: 'any' | 'many' }
  ): Promise<readonly z.infer<TData>[]>
  protected async query<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected: 'one' }
  ): Promise<z.infer<TData>>
  protected async query<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options: QueryOptions<z.infer<TData>> & { expected: 'maybeOne' }
  ): Promise<z.infer<TData> | null>
  protected async query<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData> | null | readonly z.infer<TData>[]>
  protected async query<TData extends z.AnyZodObject>(
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

  private async any<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<readonly z.infer<TData>[]> {
    const results = (await this.connection.any(query)).map((row) =>
      this.transformResult<z.infer<TData>, z.infer<TData>>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async many<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<readonly z.infer<TData>[]> {
    const results = (await this.connection.many(query)).map((row) =>
      this.transformResult<z.infer<TData>, z.infer<TData>>(row)
    )
    this.eachResult<z.infer<TData>>(results, options)
    return results
  }

  private async one<TData extends z.AnyZodObject>(
    query: TypedSqlQuery<TData>,
    options?: QueryOptions<z.infer<TData>>
  ): Promise<z.infer<TData>> {
    const result = this.transformResult<z.infer<TData>, z.infer<TData>>(
      await this.connection.one(query)
    )
    this.eachResult(result, options)
    return result
  }

  private async maybeOne<TData extends z.AnyZodObject>(
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
    TColumnName extends keyof z.infer<SelectSchema> & string
  >(
    args: ReadonlyArray<z.infer<SelectSchema>[TColumnName]>,
    column: TColumnName,
    type: string,
    loader: DataLoader<
      z.infer<SelectSchema>[TColumnName] & (string | number),
      z.infer<SelectSchema>[] | z.infer<SelectSchema> | undefined
    >,
    options?: Omit<QueryOptions<z.infer<SelectSchema>>, 'expected'>
  ): Promise<readonly z.infer<SelectSchema>[]> {
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
    TColumnNames extends Array<keyof z.infer<SelectSchema> & string>,
    TArgs extends { [K in TColumnNames[0]]: z.infer<SelectSchema>[K] }
  >(
    args: ReadonlyArray<TArgs>,
    columns: TColumnNames,
    types: string[],
    loader: DataLoader<
      TArgs,
      z.infer<SelectSchema>[] | z.infer<SelectSchema> | undefined
    >,
    options?: QueryOptions<z.infer<SelectSchema>> & SelectOptions
  ): Promise<readonly z.infer<SelectSchema>[]> {
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
        this.metadata[column as keyof z.infer<SelectSchema>]?.nativeType
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
