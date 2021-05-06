import {
  IdentifierSqlTokenType,
  sql,
  SqlSqlTokenType,
  SqlTokenType,
  TaggedTemplateLiteralInvocationType,
} from 'slonik'
import { raw } from 'slonik-sql-tag-raw'

import {
  AllowSql,
  ColumnList,
  Conditions,
  CountQueryRowType,
  GenericConditions,
  LimitClause,
  OrderColumnList,
  PrimitiveValueType,
  SerializableValueType,
  UpdateSet,
  ValueOrArray,
} from './types'
import { isOrderTuple, isSqlSqlTokenType, isSqlToken } from './utils'

export interface QueryOptions<TRowType> {
  where?: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
  groupBy?: ColumnList
  orderBy?: OrderColumnList
  having?: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
  limit?: LimitClause
}

export interface SelectOptions {
  forUpdate?: boolean | string | string[]
}

const EMPTY = sql``
const noop = (v: string): string => v

export default class QueryBuilder<
  TRowType,
  TInsertType extends { [K in keyof TRowType]?: unknown } = TRowType
> {
  constructor(
    public readonly table: string,
    protected readonly columnTypes: Record<keyof TRowType, string>,
    protected readonly columnCase: (value: string) => string = noop,
    protected readonly defaultOptions: QueryOptions<TRowType>
  ) {
    this.value = this.value.bind(this)
  }

  protected getOptions(
    options?: QueryOptions<TRowType>
  ): QueryOptions<TRowType> {
    return {
      ...this.defaultOptions,
      ...options,
    }
  }

  public identifier(
    column?: string,
    includeTable = true
  ): IdentifierSqlTokenType {
    const names = []

    includeTable && names.push(this.table)
    column !== undefined && names.push(this.columnCase(column))

    return sql.identifier(names)
  }

  /* Public core query builders */

  public select(
    options?: QueryOptions<TRowType> & SelectOptions
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    return sql<TRowType>`
      SELECT *
      FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
      ${options.groupBy ? this.groupBy(options.groupBy) : EMPTY}
      ${options.orderBy ? this.orderBy(options.orderBy) : EMPTY}
      ${options.limit ? this.limit(options.limit) : EMPTY}
      ${options.forUpdate ? this.forUpdate(options.forUpdate) : EMPTY}
    `
  }

  public insert(
    rows: ValueOrArray<AllowSql<TInsertType>>,
    options?: QueryOptions<TRowType>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    // special case: we're given a single empty row...
    // unfortunately i don't *think* we can do this if we're given numerous
    // empty rows.
    if (typeof rows === 'object' && Object.keys(rows).length === 0) {
      return this.insertDefaultValues(options)
    }

    if (!Array.isArray(rows)) {
      rows = [rows]
    }

    if (rows.length === 0) {
      throw new Error('insert requires at least one row')
    }

    if (this.isUniformRowset(rows)) {
      return this.insertUniform(rows, options)
    }

    return this.insertNonUniform(rows, options)
  }

  public update(
    values: UpdateSet<TRowType>,
    options?: QueryOptions<TRowType>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    const updateQuery = sql<TRowType>`
      UPDATE ${this.identifier()}
      ${this.set(values)}
      ${options.where ? this.where(options.where) : EMPTY}
      RETURNING *
    `
    return this.wrapCte('update', updateQuery, options)
  }

  public delete(
    options: QueryOptions<TRowType> | true
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    const force = options === true
    options = this.getOptions(options === true ? {} : options)

    if (!force && !options.where) {
      throw new Error(
        'Implicit deletion of everything is not allowed. ' +
          'To delete everything, please pass `true` or include options.'
      )
    }

    const deleteQuery = sql<TRowType>`
      DELETE FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
      RETURNING *
    `
    return this.wrapCte('delete', deleteQuery, options)
  }

  public count(
    options?: Omit<
      QueryOptions<TRowType>,
      'orderBy' | 'groupBy' | 'limit' | 'having'
    >
  ): TaggedTemplateLiteralInvocationType<CountQueryRowType> {
    options = this.getOptions(options)

    return sql<CountQueryRowType>`
      SELECT COUNT(*)
      FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
    `
  }

  public countGroup<TGroup extends Array<string & keyof TRowType>>(
    groupColumns: TGroup & Array<keyof TRowType>,
    options?: Omit<
      QueryOptions<TRowType>,
      'orderBy' | 'groupBy' | 'limit' | 'having'
    >
  ): TaggedTemplateLiteralInvocationType<
    CountQueryRowType & { [K in TGroup[0]]: TRowType[K] }
  > {
    options = this.getOptions(options)

    const columns = this.columnList(groupColumns)

    return sql<CountQueryRowType & { [K in TGroup[0]]: TRowType[K] }>`
      SELECT ${sql.join(columns, sql`, `)}, COUNT(*)
      FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
      ${this.groupBy(groupColumns)}
    `
  }

  /* Public clause builders */

  /**
   * Generate a WHERE clause
   * @param rawConditions Conditions expression
   */
  public where(
    rawConditions: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
  ): SqlSqlTokenType {
    const conditions = isSqlSqlTokenType(rawConditions)
      ? rawConditions
      : this.and(rawConditions)

    return sql`WHERE ${conditions}`
  }

  public orderBy(columns: OrderColumnList): SqlSqlTokenType {
    if (
      typeof columns === 'string' ||
      isOrderTuple(columns) ||
      (!Array.isArray(columns) && typeof columns === 'object')
    ) {
      columns = [columns]
    }

    const list = columns.map<SqlTokenType>((entry) => {
      if (typeof entry === 'object' && !Array.isArray(entry)) {
        return entry
      }

      if (typeof entry === 'string') {
        entry = [entry]
      }

      if (!Array.isArray(entry)) {
        // this shouldn't happen, but just in case
        throw new TypeError(`Unknown column list entry: ${typeof entry}`)
      }

      let [column, direction] = entry

      column = this.convertColumnEntry(column)

      if (!direction) {
        return sql`${column}`
      }

      if (typeof direction !== 'object') {
        switch (direction) {
          case 'ASC':
            direction = sql`ASC`
            break
          case 'DESC':
            direction = sql`DESC`
            break
          default:
            // this shouldn't happen, but just in case
            throw new TypeError(`Unknown order direction: ${direction}`)
        }
      }

      return sql`${column} ${direction}`
    })

    return sql`ORDER BY ${sql.join(list, sql`, `)}`
  }

  public groupBy(columns: ColumnList): SqlSqlTokenType {
    if (!Array.isArray(columns)) {
      columns = [columns]
    }

    const list = this.columnList(...columns)

    return sql`GROUP BY ${sql.join(list, sql`, `)}`
  }

  public having(
    rawConditions: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
  ): SqlSqlTokenType {
    const conditions = isSqlSqlTokenType(rawConditions)
      ? rawConditions
      : this.and(rawConditions)

    return sql`HAVING ${conditions}`
  }

  public limit(limit: LimitClause): SqlSqlTokenType {
    let offset: SqlSqlTokenType = sql``

    if (Array.isArray(limit)) {
      offset = sql` OFFSET ${limit[1]}`
      limit = limit[0]
    }

    if (limit === 'ALL') {
      limit = sql`ALL`
    }

    return sql`LIMIT ${limit}${offset}`
  }

  public forUpdate(forUpdate: true | string | string[]): SqlSqlTokenType {
    const FOR_UPDATE = sql`FOR UPDATE`

    if (forUpdate === true) {
      return FOR_UPDATE
    }

    if (!Array.isArray(forUpdate)) {
      forUpdate = [forUpdate]
    }

    const updateOf = forUpdate.map((table) => sql.identifier([table]))

    return sql`${FOR_UPDATE} OF ${sql.join(updateOf, sql`, `)}`
  }

  /* Public query-building utilities */

  public and(
    rawConditions: Conditions<TRowType> | SqlSqlTokenType[]
  ): SqlSqlTokenType {
    const conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql`true`
    }

    return sql`(${sql.join(conditions, sql` AND `)})`
  }

  public or(
    rawConditions: Conditions<TRowType> | SqlSqlTokenType[]
  ): SqlSqlTokenType {
    const conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql`true`
    }

    return sql`(${sql.join(conditions, sql` OR `)})`
  }

  public any(
    values: Array<string | number | boolean | Date | null>,
    type: string
  ): SqlSqlTokenType {
    return sql`ANY(${sql.array(values.map(this.value), sql`${raw(type)}[]`)})`
  }

  /* Protected query-building utilities */

  protected wrapCte(
    queryName: string,
    query: TaggedTemplateLiteralInvocationType<TRowType>,
    options: Omit<QueryOptions<TRowType>, 'where'>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    const queryId = this.identifier(queryName + '_rows', false)

    return sql<TRowType>`
      WITH ${queryId} AS (
        ${query}
      ) SELECT *
        FROM ${queryId}
        ${options.groupBy ? this.groupBy(options.groupBy) : EMPTY}
        ${options.orderBy ? this.orderBy(options.orderBy) : EMPTY}
        ${options.having ? this.having(options.having) : EMPTY}
        ${options.limit ? this.limit(options.limit) : EMPTY}
    `
  }

  protected insertDefaultValues(
    options?: QueryOptions<TRowType>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    const insertQuery = sql<TRowType>`
      INSERT INTO ${this.identifier()}
      DEFAULT VALUES
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected insertUniform(
    rows: TInsertType[],
    options?: QueryOptions<TRowType>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    const columns = this.rowsetKeys(rows)
    const columnExpression = sql.join(
      columns.map((c) => this.identifier(c, false)),
      sql`, `
    )

    const tableExpression = columns.map<SqlSqlTokenType>((column) => {
      return sql`${sql.identifier([column])} ${raw(this.columnTypes[column])}`
    })

    const insertQuery = sql<TRowType>`
      INSERT INTO ${this.identifier()} (${columnExpression})
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(rows)}) AS (${sql.join(
      tableExpression,
      sql`, `
    )})
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected insertNonUniform(
    rows: AllowSql<TInsertType>[],
    options?: QueryOptions<TRowType>
  ): TaggedTemplateLiteralInvocationType<TRowType> {
    options = this.getOptions(options)

    const columns = this.rowsetKeys(rows)
    const columnExpression = sql.join(
      columns.map((c) => this.identifier(c, false)),
      sql`, `
    )

    const rowExpressions = rows.map<SqlSqlTokenType>(({ ...row }) => {
      const values = columns.map<SqlSqlTokenType>((column) => {
        if (row[column] === undefined) {
          return sql`DEFAULT`
        }
        return this.valueToSql(row[column] as PrimitiveValueType | SqlTokenType)
      })
      return sql`(${sql.join(values, sql`, `)})`
    })

    const insertQuery = sql<TRowType>`
      INSERT INTO ${this.identifier()} (${columnExpression})
      VALUES ${sql.join(rowExpressions, sql`, `)}
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected conditions(
    conditions: Conditions<TRowType> | SqlSqlTokenType[]
  ): SqlSqlTokenType[] {
    if (Array.isArray(conditions)) {
      return conditions
    }

    return Object.entries(conditions as GenericConditions)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<SqlSqlTokenType>(([column, value]) => {
        const isNull = sql`${this.identifier(column)} IS NULL`

        if (value === null) {
          return isNull
        } else if (Array.isArray(value)) {
          // if it has exactly ONE non-null value, then it should be treated
          // like a normal value and ORed with `IS NULL`
          // we only need to use `any` if there are >= 2 actual, non-null values

          let sqlValue: SqlSqlTokenType
          const nullable = this.isNullable(value)
          const nonNullValues = [...value].filter(
            <V>(v: V | null): v is V => v !== null
          )

          if (nonNullValues.length === 1) {
            // We've already filtered out value === undefined above
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sqlValue = this.valueToSql(nonNullValues[0])
          } else {
            sqlValue = this.any(
              nonNullValues,
              this.columnTypes[column as keyof TRowType]
            )
          }

          const condition = sql`${this.identifier(column)} = ${sqlValue}`

          if (nullable) {
            return this.or([condition, isNull])
          } else {
            return condition
          }
        } else if (isSqlSqlTokenType(value)) {
          return sql`${this.identifier(column)} ${value}`
        }

        // We've already filtered out value === undefined above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return sql`${this.identifier(column)} = ${this.valueToSql(value!)}`
      })
  }

  protected set(values: UpdateSet<TRowType>): SqlSqlTokenType {
    const pairs = Object.entries(values)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<SqlSqlTokenType>(([column, value]) => {
        return sql`${this.identifier(column, false)} = ${this.valueToSql(
          // We've already filtered out value === undefined above
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value!
        )}`
      })
    return sql`SET ${sql.join(pairs, sql`, `)}`
  }

  protected columnList(...columns: Array<ColumnList>): SqlTokenType[] {
    return columns.flat().map<SqlTokenType>((column) => {
      if (typeof column === 'string') {
        return this.identifier(column)
      }
      return column
    })
  }

  private convertColumnEntry(
    column: string | IdentifierSqlTokenType | SqlSqlTokenType
  ): IdentifierSqlTokenType | SqlSqlTokenType {
    if (typeof column === 'object') {
      return column
    }

    return this.identifier(column)
  }

  private isNullable(array: unknown[]): boolean {
    return array.some((v): v is null => v === null)
  }

  private valueToSql(
    rawValue: SerializableValueType | SqlTokenType
  ): SqlSqlTokenType {
    if (isSqlToken(rawValue)) {
      return sql`${rawValue}`
    }
    return sql`${this.value(rawValue)}`
  }

  private value(rawValue: SerializableValueType): PrimitiveValueType {
    if (rawValue instanceof Date) {
      return rawValue.toISOString()
    }

    if (rawValue && typeof rawValue === 'object') {
      return JSON.stringify(rawValue)
    }

    return rawValue
  }

  private isValueArray(
    rawValues: unknown[]
  ): rawValues is (PrimitiveValueType | Date)[] {
    return rawValues.every((value) => {
      return (
        value instanceof Date ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        value === null
      )
    })
  }

  private rowsetKeys(
    rows: AllowSql<TInsertType>[]
  ): Array<keyof TInsertType & keyof TRowType & string> {
    const allKeys = rows.map(Object.keys)
    const keySet = new Set(...allKeys) as Set<
      keyof TInsertType & keyof TRowType & string
    >
    return Array.from(keySet)
  }

  /**
   * Determine if a rowset is 'uniform' -- i.e. the entire rowset can be
   * parameterized
   *
   * With a uniform rowset, there will only be one query parameter (`N = 1`).
   * With a non-uniform rowset, there will be `N = rows * columns` parameters.
   *
   * In theory we could partially parameterize a 'partially uniform' rowset.
   * Such a rowset would have every row with the same keys but *some* rows could
   * have non-primitive values.
   *
   * In such a 'partially uniform' rowset, there would be `N = 1 + (non-uniform
   * rows) * columns` query parameters. Every uniform row could be included in a
   * single parameter and only non-uniform rows spread out as normal.
   */
  private isUniformRowset(
    rowset: AllowSql<TInsertType>[]
  ): rowset is TInsertType[] {
    // we can only parameterize the entire row if every row has only values that
    // are either primitive values (e.g. string, number) or are convertable
    // to primitive values (e.g. Date)
    const everyRowHasOnlyValues = rowset.every((row) => {
      return this.isValueArray(Object.values(row))
    })

    // if there is only one row, we don't care about the keys!
    if (rowset.length === 1) {
      return everyRowHasOnlyValues
    }

    // if there is more than one row, we have to determine whether *all* rows
    // have the same key; otherwise `undefined` values in some rows cause weird
    // issues
    const keys = this.rowsetKeys(rowset)
    const everyRowHasSameKeys = rowset.every((row) => {
      return keys.every((key) => Object.prototype.hasOwnProperty.call(row, key))
    })

    return everyRowHasOnlyValues && everyRowHasSameKeys
  }
}
