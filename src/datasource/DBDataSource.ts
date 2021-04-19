import { camel, snake } from 'case'
import DataLoader from 'dataloader'
import {
  sql,
  DatabasePoolType,
  SqlSqlTokenType,
  TaggedTemplateLiteralInvocationType,
  IdentifierNormalizerType,
  IdentifierSqlTokenType,
} from 'slonik'

import { DataSource, DataSourceConfig } from 'apollo-datasource'

export type { DatabasePoolType } from 'slonik'

import { LoaderFactory } from './loaders'
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
import { KeyValueCache } from 'apollo-server-caching'
import { SearchableKeys } from './loaders/types'

export interface QueryOptions<TRowType, TResultType = TRowType>
  extends BuilderOptions<TRowType> {
  eachResult?: LoaderCallback<TResultType>
  expected?: 'one' | 'many' | 'maybeOne' | 'any'
}

export interface KeyNormalizers {
  keyToColumn: IdentifierNormalizerType
  columnToKey: IdentifierNormalizerType
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

export default class DBDataSource<
  TRowType,
  TContext = unknown,
  TInsertType extends { [K in keyof TRowType]?: unknown } = TRowType
> implements DataSource<TContext> {
  public static normalizers: KeyNormalizers = {
    columnToKey: camel,
    keyToColumn: snake,
  }

  protected defaultOptions: QueryOptions<TRowType> = {}

  protected context!: TContext
  protected cache!: KeyValueCache

  private _loaders?: LoaderFactory<TRowType>
  protected get loaders(): LoaderFactory<TRowType> {
    if (!this._loaders) {
      this._loaders = new LoaderFactory(this.getDataByColumn.bind(this), {
        ...DBDataSource.normalizers,
        columnTypes: this.columnTypes,
      })
    }

    return this._loaders
  }

  private _builder?: QueryBuilder<TRowType, TInsertType>
  protected get builder(): QueryBuilder<TRowType, TInsertType> {
    if (!this._builder) {
      this._builder = new QueryBuilder(
        this.table,
        this.columnTypes,
        DBDataSource.normalizers.keyToColumn,
        this.defaultOptions
      )
    }

    return this._builder
  }

  constructor(
    protected readonly pool: DatabasePoolType,
    protected readonly table: string,
    /**
     * Types of the columns in the database.
     * Used to map values for insert and lookups on multiple values.
     *
     * EVERY DATASOURCE MUST PROVIDE THIS AS STUFF WILL BREAK OTHERWISE. SORRY.
     */
    protected readonly columnTypes: Record<keyof TRowType, string>
  ) {}

  public async initialize(config: DataSourceConfig<TContext>): Promise<void> {
    this.context = config.context
    this.cache = config.cache
  }

  /**
   * Find a single row
   *
   * @param options Query options
   */
  public async get(
    options: QueryOptions<TRowType> & SelectOptions & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Possibly find a single row
   *
   * @param options Query options
   */
  public async get(
    options: QueryOptions<TRowType> & SelectOptions & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Find multiple rows
   *
   * @param options Query options
   */
  public async get(
    options?: QueryOptions<TRowType> &
      SelectOptions & { expected?: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  public async get(
    options?: QueryOptions<TRowType> & SelectOptions
  ): Promise<TRowType | readonly TRowType[] | null> {
    const query = this.builder.select(options)

    return await this.query(query, options)
  }

  public async count(
    options?: Omit<QueryOptions<TRowType, CountQueryRowType>, 'expected'>
  ): Promise<number> {
    const query = this.builder.count(options)
    const result = await this.query(query, {
      ...options,
      expected: 'one',
    })
    return result.count
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
      options.expected = !isArray(rows) || rows.length === 1 ? 'one' : 'many'
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
    query: TaggedTemplateLiteralInvocationType<TData>,
    options: QueryOptions<TData> & { expected?: 'any' | 'many' }
  ): Promise<readonly TData[]>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options: QueryOptions<TData> & { expected: 'one' }
  ): Promise<TData>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options: QueryOptions<TData> & { expected: 'maybeOne' }
  ): Promise<TData | null>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null | readonly TData[]>
  protected async query<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
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
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = (await this.pool.any(query)).map((row) =>
      this.transformResult<TData, TData>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async many<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = (await this.pool.many(query)).map((row) =>
      this.transformResult<TData, TData>(row)
    )
    this.eachResult(results, options)
    return results
  }

  private async one<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData> {
    const result = this.transformResult<TData, TData>(
      await this.pool.one(query)
    )
    this.eachResult(result, options)
    return result
  }

  private async maybeOne<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null> {
    let result = await this.pool.maybeOne(query)
    if (result) {
      result = this.transformResult<TData, TData>(result)
    }
    this.eachResult(result, options)
    return result
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
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<readonly TRowType[]> {
    return await this.get({
      ...options,
      expected: 'any',
      where: {
        [column]: sql`= ${this.builder.any(
          ([...args] as unknown) as (string | number | boolean | Date | null)[],
          type
        )}`,
        ...options?.where,
      },
    })
  }

  private transformResult<TInput, TOutput>(input: TInput): TOutput {
    const transform = DBDataSource.normalizers.columnToKey

    const output = Object.keys(input).reduce<TOutput>((obj, key) => {
      const column = transform(key)
      const type: string | undefined = this.columnTypes[
        column as keyof TRowType
      ]
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

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnLoader<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    column: TColumnName,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TRowType[TColumnName], TRowType | undefined> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column, type, { callbackFn })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnMultiLoader<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    column: TColumnName,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TRowType[TColumnName], TRowType[]> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column, type, { multi: true, callbackFn })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnLoaderCI<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    column: TColumnName,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TRowType[TColumnName], TRowType | undefined> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column, type, {
      // We don't really know the type of the column, but to maintain backwards
      // compatibility we're just going to force this through
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ignoreCase: true as any,
      callbackFn,
    })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnMultiLoaderCI<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    column: TColumnName,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TRowType[TColumnName], TRowType[]> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column, type, {
      multi: true,
      // We don't really know the type of the column, but to maintain backwards
      // compatibility we're just going to force this through
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ignoreCase: true as any,
      callbackFn,
    })
  }

  /**
   * @deprecated Use the query builder instead
   */
  protected buildWhere(options?: QueryOptions<TRowType>): SqlSqlTokenType {
    return this.builder.where(options?.where || {})
  }

  /**
   * @deprecated Use query builder instead
   */
  public column(columnName: string): IdentifierSqlTokenType {
    return this.builder.identifier(columnName)
  }

  /**
   * @deprecated TBD
   */
  protected createFinder<TInput, TOutput>(
    loader: DataLoader<TInput, TOutput | undefined>
  ): (input: TInput) => Promise<TOutput | null> {
    return async (target: TInput) => {
      const result = await loader.load(target)
      if (!result) {
        return null
      }
      return result
    }
  }

  /**
   * @deprecated TBD
   */
  protected createMultiFinder<TInput, TOutput>(
    loader: DataLoader<TInput, TOutput[]>
  ): (input: TInput) => Promise<TOutput[]> {
    return async (target: TInput) => {
      const result = await loader.load(target)
      if (!result) {
        return []
      }
      return result
    }
  }

  /**
   * @deprecated Use `insert`
   */
  protected async insertOne(
    data: AllowSql<TInsertType>,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<TRowType> {
    return await this.insert(data, {
      ...options,
      expected: 'one',
    })
  }

  /**
   * @deprecated Use `insert`
   */
  protected async insertMany(
    data: Array<AllowSql<TInsertType>>,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<TRowType[]> {
    return [
      ...(await this.insert(data, {
        ...options,
        expected: 'any',
      })),
    ]
  }

  /**
   * @deprecated Use `update`
   */
  protected updateOne(
    data: UpdateSet<TRowType>,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<TRowType> {
    return this.update(data, {
      ...options,
      expected: 'one',
    })
  }

  /**
   * @deprecated Use `update`
   */
  protected async updateMany(
    data: UpdateSet<TRowType>,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<TRowType[]> {
    return [
      ...(await this.update(data, {
        ...options,
        expected: 'any',
      })),
    ]
  }

  /**
   * @deprecated Use `delete`
   */
  protected deleteOne(
    options: Pick<QueryOptions<TRowType>, 'where' | 'eachResult'>
  ): Promise<TRowType | null> {
    return this.delete({
      ...options,
      expected: 'maybeOne',
    })
  }

  /**
   * @deprecated Use `delete`
   */
  protected async deleteMany(
    options: Pick<QueryOptions<TRowType>, 'where' | 'eachResult'>
  ): Promise<TRowType[]> {
    return [
      ...(await this.delete({
        ...options,
        expected: 'any',
      })),
    ]
  }

  /**
   * @deprecated use `get`
   */
  public async findOneBy(
    where: Required<QueryOptions<TRowType>>['where']
  ): Promise<TRowType | null> {
    return this.get({
      where,
      expected: 'one',
    })
  }

  /**
   * @deprecated use `get`
   */
  public async findManyBy(
    where: Required<QueryOptions<TRowType>>['where']
  ): Promise<TRowType[]> {
    return [
      ...(await this.get({
        where,
        expected: 'any',
      })),
    ]
  }

  /**
   * @deprecated use `get`
   */
  public async all(
    options: LoaderCallback<TRowType> | QueryOptions<TRowType> = {}
  ): Promise<TRowType[]> {
    if (typeof options === 'function') {
      options = { eachResult: options }
    }

    const result = await this.get({
      ...options,
      expected: 'any',
    })

    return [...result]
  }
}
