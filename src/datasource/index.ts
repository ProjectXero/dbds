import { camel, snake } from 'case'
import DataLoader from 'dataloader'
import {
  sql,
  DatabasePoolType,
  SqlSqlTokenType,
  TaggedTemplateLiteralInvocationType,
} from 'slonik'
import { raw } from 'slonik-sql-tag-raw'

import { DataSource, DataSourceConfig } from 'apollo-datasource'

export type { DatabasePoolType } from 'slonik'

export { DataLoader, sql }

export type LoaderCallback<TRowType> = (
  value: TRowType,
  index: number,
  array: readonly TRowType[]
) => void

export interface QueryOptions {
  columnTransformation?: (column: string) => string
}

export interface CountQueryRowType {
  count: number
}

export const buildConditions = <TData extends Record<string, any>>(
  data: TData,
  { columnTransformation = snake }: QueryOptions = {}
): SqlSqlTokenType[] => {
  const conditions = Object.keys(data)
    .filter((value) => value !== undefined)
    .map<SqlSqlTokenType | undefined>((key) => {
      const column = columnTransformation(key)
      const value = data[key]
      if (value === undefined) {
        return
      }

      return sql`${sql.identifier([column])} = ${value}`
    })
    .filter<SqlSqlTokenType>((v): v is SqlSqlTokenType => v !== undefined)
  return conditions
}

export class DBDataSource<
  TRowType extends Record<string, any>,
  TContext = unknown
  > implements DataSource<TContext> {
  protected pool: DatabasePoolType
  protected context?: TContext
  protected cache: any

  protected defaultOrder: SqlSqlTokenType = sql``

  public readonly table: string

  constructor(pool: DatabasePoolType, table: string) {
    this.table = table
    this.pool = pool
  }

  public async initialize(config: DataSourceConfig<TContext>): Promise<void> {
    this.context = config.context
    this.cache = config.cache
  }

  public async all(
    callbackFn: LoaderCallback<TRowType> = () => { }
  ): Promise<readonly TRowType[]> {
    const query = sql<TRowType>`
      SELECT *
      FROM ${sql.identifier([this.table])}
      ${this.defaultOrder}
    `
    const result = await this.pool.any(query)
    result.forEach(callbackFn)

    return result
  }

  private async getDataByColumn<TColType extends string | number = string>(
    args: TColType[],
    column: string,
    type: string
  ): Promise<readonly TRowType[]> {
    const query = sql<TRowType>`
        SELECT *
        FROM ${sql.identifier([this.table])}
        WHERE ${sql.identifier([this.table, column.toString()])} =
          ANY(${sql.array(args as TColType[], sql`${raw(type)}[]`)})
        ${this.defaultOrder}
      `

    return await this.pool.any(query)
  }

  protected createColumnLoader<TColType extends string | number = string>(
    column: string,
    type: string,
    callbackFn: LoaderCallback<TRowType> = () => { }
  ): DataLoader<TColType, TRowType | undefined> {
    const camelColumn = camel(column)
    return new DataLoader<TColType, TRowType | undefined>(
      async (args: readonly TColType[]) => {
        const data = await this.getDataByColumn(
          args as TColType[],
          column,
          type
        )
        data.forEach(callbackFn)
        return args.map((arg) => data.find((row) => row[camelColumn] === arg))
      }
    )
  }

  protected createColumnMultiLoader<TColType extends string | number = string>(
    column: string,
    type: string,
    callbackFn: LoaderCallback<TRowType> = () => { }
  ): DataLoader<TColType, TRowType[]> {
    const camelColumn = camel(column)
    return new DataLoader<TColType, TRowType[]>(
      async (args: readonly TColType[]) => {
        const data = await this.getDataByColumn(
          args as TColType[],
          column,
          type
        )
        data.forEach(callbackFn)
        return args.map((arg) => data.filter((row) => row[camelColumn] === arg))
      }
    )
  }

  protected createColumnLoaderCI<TColType extends string | number = string>(
    column: string,
    type: string,
    callbackFn: LoaderCallback<TRowType> = () => { }
  ): DataLoader<TColType, TRowType | undefined> {
    const camelColumn = camel(column)
    return new DataLoader<TColType, TRowType | undefined>(
      async (args: readonly TColType[]) => {
        const data = await this.getDataByColumn(
          args as TColType[],
          column,
          type
        )
        data.forEach(callbackFn)
        return args.map((arg) =>
          data.find(
            (row) =>
              row[camelColumn].toString().toLowerCase() ===
              arg.toString().toLowerCase()
          )
        )
      }
    )
  }

  protected createColumnMultiLoaderCI<
    TColType extends string | number = string
  >(
    column: string,
    type: string,
    callbackFn: LoaderCallback<TRowType> = () => { }
  ): DataLoader<TColType, TRowType[]> {
    const camelColumn = camel(column)
    return new DataLoader<TColType, TRowType[]>(
      async (args: readonly TColType[]) => {
        const data = await this.getDataByColumn(
          args as TColType[],
          column,
          type
        )
        data.forEach(callbackFn)
        return args.map((arg) =>
          data.filter(
            (row) =>
              row[camelColumn].toString().toLowerCase() ===
              arg.toString().toLowerCase()
          )
        )
      }
    )
  }

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

  private findByQuery<TData extends Partial<TRowType>>(
    where: TData
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    const conditions = buildConditions(where)
    const query = sql<TRowType>`
      SELECT *
      FROM ${sql.identifier([this.table])}
      WHERE (
        ${sql.join(conditions, sql` AND `)}
      )
      ${this.defaultOrder}
    `
    return query
  }

  public async findOneBy<TData extends Partial<TRowType>>(
    where: TData
  ): Promise<TRowType | null> {
    const query = this.findByQuery(where)
    return await this.pool.maybeOne<TRowType>(query)
  }

  public async findManyBy<TData extends Partial<TRowType>>(
    where: TData
  ): Promise<readonly TRowType[]> {
    const query = this.findByQuery(where)
    return await this.pool.any<TRowType>(query)
  }

  protected async insert<TData extends Partial<TRowType>>(
    data: TData,
    { columnTransformation = snake }: QueryOptions = {}
  ): Promise<TRowType> {
    const columns = Object.keys(data)
      .map((key) => columnTransformation(key))
      .map((column) => sql.identifier([column]))

    const values = Object.values(data).map((value) => sql`${value}`)

    const query = sql<TRowType>`
      INSERT INTO ${sql.identifier([this.table])} (
        ${sql.join(columns, sql`, `)}
      ) VALUES (
        ${sql.join(values, sql`, `)}
      ) RETURNING *
    `

    return await this.pool.one(query)
  }

  private updateQuery<
    TData extends Partial<TRowType>,
    TWhere extends Partial<TRowType>
  >(
    data: TData,
    where: TWhere,
    options: QueryOptions = {}
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    const columns = buildConditions(data, options)
    const conditions = buildConditions(where, options)

    let whereClause = sql``
    if (conditions.length > 0) {
      whereClause = sql`WHERE (
        ${sql.join(conditions, sql` AND `)}
      )`
    }

    const query = sql<TRowType>`
      UPDATE ${sql.identifier([this.table])}
      SET
        ${sql.join(columns, sql`, `)}
      ${whereClause} RETURNING *
    `
    return query
  }

  protected async updateOne<
    TData extends Partial<TRowType>,
    TWhere extends Partial<TRowType>
  >(data: TData, where: TWhere, options: QueryOptions = {}): Promise<TRowType> {
    const query = this.updateQuery(data, where, options)
    return await this.pool.one<TRowType>(query)
  }

  protected async updateMany<
    TData extends Partial<TRowType>,
    TWhere extends Partial<TRowType>
  >(
    data: TData,
    where: TWhere,
    options: QueryOptions = {}
  ): Promise<readonly TRowType[]> {
    const query = this.updateQuery(data, where, options)
    return await this.pool.any<TRowType>(query)
  }

  private countQuery<TWhere extends Partial<TRowType>>(
    where: TWhere,
    options: QueryOptions = {}
  ): TaggedTemplateLiteralInvocationType<CountQueryRowType> {
    const conditions = buildConditions(where, options)

    let whereClause = sql``
    if (conditions.length > 0) {
      whereClause = sql`WHERE (
        ${sql.join(conditions, sql` AND `)}
      )`
    }

    const query = sql<CountQueryRowType>`
      SELECT COUNT(*)
      FROM ${sql.identifier([this.table])}
      ${whereClause}
    `
    return query
  }

  public async count<TWhere extends Partial<TRowType>>(
    where: TWhere,
    options: QueryOptions = {}
  ): Promise<number> {
    const query = this.countQuery(where, options)
    return await this.pool.oneFirst(query)
  }
}
