import {
  IdentifierSqlToken,
  SerializableValue,
  sql,
  FragmentSqlToken,
  SqlToken,
} from 'slonik'
import { raw } from 'slonik-sql-tag-raw'
import { TypedSqlQuery } from '../../types'

import {
  AllowSql,
  ColumnList,
  Conditions,
  // CountQueryRowType,
  GenericConditions,
  LimitClause,
  OrderColumnList,
  PrimitiveValueType,
  SerializableValueType,
  UpdateSet,
  ValueOrArray,
} from './types'
import { isOrderTuple, isFragmentSqlToken, isSqlToken } from './utils'

export interface QueryOptions<TRowType> {
  where?: Conditions<TRowType> | FragmentSqlToken[] | FragmentSqlToken
  groupBy?: ColumnList
  orderBy?: OrderColumnList
  having?: Conditions<TRowType> | FragmentSqlToken[] | FragmentSqlToken
  limit?: LimitClause
}

export interface SelectOptions {
  forUpdate?: boolean | string | string[]
}

const EMPTY = sql.fragment``
const noop = (v: string): string => v
const CONDITIONS_TABLE = 'conditions'

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
    includeTable: boolean | string = true
  ): IdentifierSqlToken {
    const names = []

    if (typeof includeTable === 'string') {
      names.push(includeTable)
    } else if (includeTable) {
      names.push(this.table)
    }
    column !== undefined && names.push(this.columnCase(column))

    return sql.identifier(names)
  }

  public jsonIdentifier(name: string): FragmentSqlToken {
    return raw(`'${name}'`)
  }

  /* Public core query builders */

  public select(options?: QueryOptions<TRowType> & SelectOptions) {
    options = this.getOptions(options)

    return sql.unsafe`
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
  ) {
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

  public update(values: UpdateSet<TRowType>, options?: QueryOptions<TRowType>) {
    options = this.getOptions(options)

    const updateQuery = sql.unsafe`
      UPDATE ${this.identifier()}
      ${this.set(values)}
      ${options.where ? this.where(options.where) : EMPTY}
      RETURNING *
    `
    return this.wrapCte('update', updateQuery, options)
  }

  public delete(options: QueryOptions<TRowType> | true) {
    const force = options === true
    options = this.getOptions(options === true ? {} : options)

    if (!force && !options.where) {
      throw new Error(
        'Implicit deletion of everything is not allowed. ' +
          'To delete everything, please pass `true` or include options.'
      )
    }

    const deleteQuery = sql.unsafe`
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
  ) {
    options = this.getOptions(options)

    return sql.unsafe`
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
  ) {
    options = this.getOptions(options)

    const columns = this.columnList(groupColumns)

    return sql.unsafe`
      SELECT ${sql.join(columns, sql.fragment`, `)}, COUNT(*)
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
    rawConditions: Conditions<TRowType> | FragmentSqlToken[] | FragmentSqlToken
  ): FragmentSqlToken {
    const conditions = isFragmentSqlToken(rawConditions)
      ? rawConditions
      : this.and(rawConditions)

    return sql.fragment`WHERE ${conditions}`
  }

  public orderBy(columns: OrderColumnList): FragmentSqlToken {
    if (
      typeof columns === 'string' ||
      isOrderTuple(columns) ||
      (!Array.isArray(columns) && typeof columns === 'object')
    ) {
      columns = [columns]
    }

    const list = columns.map<SqlToken>((entry) => {
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
        return sql.fragment`${column}`
      }

      if (typeof direction !== 'object') {
        switch (direction) {
          case 'ASC':
            direction = sql.fragment`ASC`
            break
          case 'DESC':
            direction = sql.fragment`DESC`
            break
          default:
            // this shouldn't happen, but just in case
            throw new TypeError(`Unknown order direction: ${direction}`)
        }
      }

      return sql.fragment`${column} ${direction}`
    })

    return sql.fragment`ORDER BY ${sql.join(list, sql.fragment`, `)}`
  }

  public groupBy(columns: ColumnList): FragmentSqlToken {
    if (!Array.isArray(columns)) {
      columns = [columns]
    }

    const list = this.columnList(...columns)

    return sql.fragment`GROUP BY ${sql.join(list, sql.fragment`, `)}`
  }

  public having(
    rawConditions: Conditions<TRowType> | FragmentSqlToken[] | FragmentSqlToken
  ): FragmentSqlToken {
    const conditions = isFragmentSqlToken(rawConditions)
      ? rawConditions
      : this.and(rawConditions)

    return sql.fragment`HAVING ${conditions}`
  }

  public limit(limit: LimitClause): FragmentSqlToken {
    let offset: FragmentSqlToken = sql.fragment``

    if (Array.isArray(limit)) {
      offset = sql.fragment` OFFSET ${limit[1]}`
      limit = limit[0]
    }

    if (limit === 'ALL') {
      limit = sql.fragment`ALL`
    }

    return sql.fragment`LIMIT ${limit}${offset}`
  }

  public forUpdate(forUpdate: true | string | string[]): FragmentSqlToken {
    const FOR_UPDATE = sql.fragment`FOR UPDATE`

    if (forUpdate === true) {
      return FOR_UPDATE
    }

    if (!Array.isArray(forUpdate)) {
      forUpdate = [forUpdate]
    }

    const updateOf = forUpdate.map((table) => sql.identifier([table]))

    return sql.fragment`${FOR_UPDATE} OF ${sql.join(
      updateOf,
      sql.fragment`, `
    )}`
  }

  /* Public query-building utilities */

  public and(
    rawConditions: Conditions<TRowType> | FragmentSqlToken[]
  ): FragmentSqlToken {
    const conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql.fragment`true`
    }

    return sql.fragment`(${sql.join(conditions, sql.fragment` AND `)})`
  }

  public or(
    rawConditions: Conditions<TRowType> | FragmentSqlToken[]
  ): FragmentSqlToken {
    const conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql.fragment`true`
    }

    return sql.fragment`(${sql.join(conditions, sql.fragment` OR `)})`
  }

  public any(
    values: Array<string | number | boolean | Date | null>,
    type: string
  ): FragmentSqlToken {
    return sql.fragment`ANY(${sql.array(
      values.map(this.value),
      sql.fragment`${raw(type)}[]`
    )})`
  }

  /* Protected query-building utilities */

  protected wrapCte(
    queryName: string,
    query: TypedSqlQuery<unknown>,
    options: Omit<QueryOptions<TRowType>, 'where'>
  ) {
    const queryId = this.identifier(queryName + '_rows', false)

    return sql.unsafe`
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

  protected insertDefaultValues(options?: QueryOptions<TRowType>) {
    options = this.getOptions(options)

    const insertQuery = sql.unsafe`
      INSERT INTO ${this.identifier()}
      DEFAULT VALUES
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected insertUniform(
    rows: TInsertType[],
    options?: QueryOptions<TRowType>
  ) {
    options = this.getOptions(options)

    const columns = this.rowsetKeys(rows)
    const columnExpression = sql.join(
      columns.map((c) => this.identifier(c, false)),
      sql.fragment`, `
    )

    const tableExpression = columns.map<FragmentSqlToken>((column) => {
      return sql.fragment`${sql.identifier([column])} ${raw(
        this.columnTypes[column]
      )}`
    })

    const insertQuery = sql.unsafe`
      INSERT INTO ${this.identifier()} (${columnExpression})
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(rows)}) AS (${sql.join(
      tableExpression,
      sql.fragment`, `
    )})
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected insertNonUniform(
    rows: AllowSql<TInsertType>[],
    options?: QueryOptions<TRowType>
  ) {
    options = this.getOptions(options)

    const columns = this.rowsetKeys(rows)
    const columnExpression = sql.join(
      columns.map((c) => this.identifier(c, false)),
      sql.fragment`, `
    )

    const rowExpressions = rows.map<FragmentSqlToken>(({ ...row }) => {
      const values = columns.map<FragmentSqlToken>((column) => {
        if (row[column] === undefined) {
          return sql.fragment`DEFAULT`
        }
        return this.valueToSql(row[column] as PrimitiveValueType | SqlToken)
      })
      return sql.fragment`(${sql.join(values, sql.fragment`, `)})`
    })

    const insertQuery = sql.unsafe`
      INSERT INTO ${this.identifier()} (${columnExpression})
      VALUES ${sql.join(rowExpressions, sql.fragment`, `)}
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options)
  }

  protected conditions(
    conditions: Conditions<TRowType> | FragmentSqlToken[]
  ): FragmentSqlToken[] {
    if (Array.isArray(conditions)) {
      return conditions
    }

    return Object.entries(conditions as GenericConditions)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<FragmentSqlToken>(([column, value]) => {
        const isNull = sql.fragment`${this.identifier(column)} IS NULL`

        if (value === null) {
          return isNull
        } else if (Array.isArray(value)) {
          // if it has exactly ONE non-null value, then it should be treated
          // like a normal value and ORed with `IS NULL`
          // we only need to use `any` if there are >= 2 actual, non-null values

          let sqlValue: FragmentSqlToken
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

          const condition = sql.fragment`${this.identifier(
            column
          )} = ${sqlValue}`

          if (nullable) {
            return this.or([condition, isNull])
          } else {
            return condition
          }
        } else if (isFragmentSqlToken(value) && value !== undefined) {
          return sql.fragment`${this.identifier(column)} ${value}`
        }

        // We've already filtered out value === undefined above
        return sql.fragment`${this.identifier(column)} = ${this.valueToSql(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value!
        )}`
      })
  }

  protected set(values: UpdateSet<TRowType>): FragmentSqlToken {
    const pairs = Object.entries(values)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<FragmentSqlToken>(([column, value]) => {
        return sql.fragment`${this.identifier(
          column,
          false
        )} = ${this.valueToSql(
          // We've already filtered out value === undefined above
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value!
        )}`
      })
    return sql.fragment`SET ${sql.join(pairs, sql.fragment`, `)}`
  }

  protected columnList(...columns: Array<ColumnList>): SqlToken[] {
    return columns.flat().map<SqlToken>((column) => {
      if (typeof column === 'string') {
        return this.identifier(column)
      }
      return column
    })
  }

  public multiColumnBatchGet<
    TColumnNames extends Array<keyof TRowType & string>
  >(
    args: ReadonlyArray<Record<TColumnNames[0], TRowType[TColumnNames[0]]>>,
    columns: TColumnNames,
    types: string[],
    options?: QueryOptions<TRowType> & SelectOptions
  ) {
    options = this.getOptions(options)
    const typedColumns = this.jsonTypedColumns(columns, types)
    return sql.unsafe`
      SELECT ${this.identifier()}.*
      FROM ${this.identifier()},
      ${this.jsonRowComparison(
        args as ReadonlyArray<Partial<TRowType>>,
        typedColumns
      )}
      WHERE ${this.columnConditionsMap(columns, types)}
      ${options.groupBy ? this.groupBy(options.groupBy) : EMPTY}
      ${options.orderBy ? this.orderBy(options.orderBy) : EMPTY}
      ${options.limit ? this.limit(options.limit) : EMPTY}
      ${options.forUpdate ? this.forUpdate(options.forUpdate) : EMPTY}
    `
  }

  private jsonTypedColumns<TColumnNames extends Array<keyof TRowType & string>>(
    columns: TColumnNames,
    types: string[]
  ): FragmentSqlToken {
    return sql.fragment`${sql.join(
      columns.map((columnName, idx) => {
        const column = this.columnCase(columnName)
        const type = types[idx]
        return sql.fragment`(conditions->>${this.jsonIdentifier(
          column
        )})::${this.identifier(type, false)} AS ${this.identifier(
          column,
          false
        )}`
      }),
      sql.fragment`, `
    )}`
  }

  private jsonRowComparison(
    args: ReadonlyArray<Partial<TRowType>>,
    typedColumns: FragmentSqlToken
  ) {
    const jsonObject: SerializableValue[] = args.map((entry) =>
      Object.entries(entry).reduce((result, [key, value]) => {
        return {
          ...result,
          [this.columnCase(key)]: value as SerializableValue,
        }
      }, {} as object & SerializableValue)
    )
    return sql.unsafe`
      (
        SELECT ${typedColumns}
        FROM jsonb_array_elements(${sql.json(jsonObject)}) AS conditions
      ) AS ${this.identifier(`${this.table}_${CONDITIONS_TABLE}`, false)}
    `
  }

  private columnConditionsMap(
    columns: Array<keyof TRowType & string>,
    types: string[]
  ): FragmentSqlToken {
    return sql.fragment`${sql.join(
      columns.map((columnName, idx) => {
        const tableColumn = this.identifier(columnName)
        const conditionsColumn = this.identifier(
          columnName,
          `${this.table}_${CONDITIONS_TABLE}`
        )
        const type = this.identifier(types[idx], false)

        // eslint-disable-next-line max-len
        return sql.fragment`${tableColumn}::${type} = ${conditionsColumn}::${type}`
      }),
      sql.fragment` AND `
    )}`
  }

  private convertColumnEntry(
    column: string | IdentifierSqlToken | FragmentSqlToken
  ): IdentifierSqlToken | FragmentSqlToken {
    if (typeof column === 'object') {
      return column
    }

    return this.identifier(column)
  }

  private isNullable(array: unknown[]): boolean {
    return array.some((v): v is null => v === null)
  }

  private valueToSql(
    rawValue: SerializableValueType | SqlToken
  ): FragmentSqlToken {
    if (isSqlToken(rawValue)) {
      return sql.fragment`${rawValue}`
    }
    return sql.fragment`${this.value(rawValue)}`
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
