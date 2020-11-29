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
import QueryBuilder, { QueryOptions as BuilderOptions } from './queries/QueryBuilder'
import { AllowSql, CountQueryRowType, UpdateSet, ValueOrArray } from './queries/types'

export interface QueryOptions<TRowType, TResultType = TRowType> extends BuilderOptions<TRowType> {
  keyToColumn?: IdentifierNormalizerType;
  columnToKey?: IdentifierNormalizerType;
  eachResult?: LoaderCallback<TResultType>;
  expected?: 'one' | 'many' | 'maybeOne' | 'any'
}

export { DataLoader, sql }

export type LoaderCallback<TResultType> = (
  value: TResultType,
  index: number,
  array: readonly TResultType[]
) => void

export default class DBDataSource<
  TRowType extends Record<string, any>,
  TContext = unknown,
  TInsertType extends { [K in keyof TRowType]?: unknown } = TRowType
  > implements DataSource<TContext> {
  protected context?: TContext
  protected cache: any
  protected loaders: LoaderFactory<TRowType>
  protected builder: QueryBuilder<TRowType, TInsertType>

  protected defaultOrder: SqlSqlTokenType = sql``

  /**
   * Types of the columns in the database.
   * Used to map values for insert and lookups on multiple values.
   *
   * EVERY DATASOURCE SHOULD PROVIDE THIS AS STUFF WILL BREAK OTHERWISE.
   */
  protected readonly columnTypes: Record<keyof TRowType, string> = {} as any

  constructor(
    protected readonly pool: DatabasePoolType,
    protected readonly table: string
  ) {
    this.loaders = new LoaderFactory(this.getDataByColumn.bind(this), {
      columnToKey: camel,
      keyToColumn: snake,
    })
    this.builder = new QueryBuilder(table, this.columnTypes)
  }

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
    options: QueryOptions<TRowType> & { expected: 'one' }
  ): Promise<TRowType>

  /**
   * Possibly find a single row
   *
   * @param options Query options
   */
  public async get(
    options: QueryOptions<TRowType> & { expected: 'maybeOne' }
  ): Promise<TRowType | null>

  /**
   * Find multiple rows
   *
   * @param options Query options
   */
  public async get(
    options?: QueryOptions<TRowType> & { expected?: 'any' | 'many' }
  ): Promise<readonly TRowType[]>

  public async get(
    options?: QueryOptions<TRowType>
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
    options?: QueryOptions<TRowType>
  ): Promise<TRowType | readonly TRowType[] | null> {
    const query = this.builder.insert(rows, options)

    options = {
      ...options,
      expected: options?.expected ?? rows.length === 1 ? 'one' : 'many'
    }

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
    const query = this.builder.update(data)
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
  protected async delete(
    options: true
  ): Promise<readonly TRowType[]>

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
        return this.one(query, options)
      case 'maybeOne':
        return this.maybeOne(query, options)
      case 'many':
        return this.many(query, options)
      case 'any':
        return this.any(query, options)
    }
  }

  private async any<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = await this.pool.any(query)
    this.eachResult(results, options)
    return results
  }

  private async many<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<readonly TData[]> {
    const results = await this.pool.many(query)
    this.eachResult(results, options)
    return results
  }

  private async one<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData> {
    const results = await this.pool.one(query)
    this.eachResult(results, options)
    return results
  }

  private async maybeOne<TData>(
    query: TaggedTemplateLiteralInvocationType<TData>,
    options?: QueryOptions<TData>
  ): Promise<TData | null> {
    const results = await this.pool.maybeOne(query)
    this.eachResult(results, options)
    return results
  }

  private eachResult<TData>(
    results: TData | null | ReadonlyArray<TData | null>,
    { eachResult }: QueryOptions<TData> = {}
  ): void {
    if (!eachResult) {
      return
    }

    if (!Array.isArray(results)) {
      results = [results]
    }

    results
      .filter((val): val is TData => val !== null)
      .forEach(eachResult)
  }

  private getDataByColumn<TColType extends string | number = string>(
    args: readonly TColType[],
    column: keyof TRowType,
    type: string,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<readonly TRowType[]> {
    return this.get({
      ...options,
      expected: 'any',
      where: {
        [column]: this.builder.any([...args] as string[] | number[], type),
        ...options?.where,
      },
    });
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnLoader<
    TColType extends string | number = string
  >(
    column: string,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TColType, TRowType | undefined> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column as any, type, { callbackFn })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnMultiLoader<
    TColType extends string | number = string
  >(
    column: string,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TColType, TRowType[]> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column as any, type, { multi: true, callbackFn })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnLoaderCI<
    TColType extends string | number = string
  >(
    column: string,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TColType, TRowType | undefined> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column as any, type, { ignoreCase: true as any, callbackFn })
  }

  /**
   * @deprecated Use the loader factory instead
   */
  protected createColumnMultiLoaderCI<
    TColType extends string | number = string
  >(
    column: string,
    type: string,
    callbackFn?: LoaderCallback<TRowType> | QueryOptions<TRowType>
  ): DataLoader<TColType, TRowType[]> {
    if (typeof callbackFn === 'object') {
      callbackFn = callbackFn.eachResult
    }
    return this.loaders.create(column as any, type, { multi: true, ignoreCase: true as any, callbackFn })
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
  protected insertOne(
    data: AllowSql<TInsertType>,
    options?: Omit<QueryOptions<TRowType>, 'expected'>
  ): Promise<TRowType> {
    return this.insert(data, {
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
      ...await this.insert(data, {
        ...options,
        expected: 'any',
      })
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
      ...await this.update(data, {
        ...options,
        expected: 'any',
      })
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
      expected: 'maybeOne'
    })
  }

  /**
   * @deprecated Use `delete`
   */
  protected async deleteMany(
    options: Pick<QueryOptions<TRowType>, 'where' | 'eachResult'>
  ): Promise<TRowType[]> {
    return [
      ...await this.delete({
        ...options,
        expected: 'any'
      })
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
      ...await this.get({
        where,
        expected: 'any',
      })
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
