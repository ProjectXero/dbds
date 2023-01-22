import {
  IdentifierSqlToken,
  SerializableValue,
  sql,
  FragmentSqlToken,
  SqlToken,
} from 'slonik'
import { raw } from 'slonik-sql-tag-raw'
import { z } from 'zod'
import { TypedSqlQuery } from '../../types'
import { TableInfo, TableMetadata } from '../types'

import {
  ColumnList,
  Conditions,
  GenericConditions,
  LimitClause,
  OrderColumnList,
  PrimitiveValueType,
  SerializableValueType,
  ValueOrArray,
} from './types'
import { isOrderTuple, isFragmentSqlToken, isSqlToken } from './utils'

export interface QueryOptions<Schema> {
  where?: Conditions<Schema> | FragmentSqlToken[] | FragmentSqlToken
  groupBy?: ColumnList
  orderBy?: OrderColumnList
  having?: Conditions<Schema> | FragmentSqlToken[] | FragmentSqlToken
  limit?: LimitClause
}

export interface SelectOptions {
  forUpdate?: boolean | string | string[]
}

const EMPTY = sql.fragment``
const CONDITIONS_TABLE = 'conditions'
const COUNT_SCHEMA = z.object({ count: z.number() })

function isColumn<T extends string>(
  column: string | undefined,
  metadata: TableMetadata<T>
): column is keyof typeof metadata {
  if (!column) {
    return false
  }
  return Object.keys(metadata).includes(column)
}

export default class QueryBuilder<Info extends TableInfo> {
  constructor(
    public readonly info: Info,
    protected readonly defaultOptions: QueryOptions<
      z.infer<Info['schemas']['select']>
    >,
    protected readonly defaultSymbol: symbol
  ) {
    this.value = this.value.bind(this)
  }

  protected get table(): string {
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

  protected getOptions(
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ): QueryOptions<z.infer<Info['schemas']['select']>> {
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
    if (isColumn(column, this.metadata)) {
      names.push(this.metadata[column].nativeName)
    } else if (column) {
      names.push(column)
    }

    return sql.identifier(names)
  }

  public jsonIdentifier(name: string): FragmentSqlToken {
    return raw(`'${name}'`)
  }

  /* Public core query builders */

  public select(
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & SelectOptions
  ): TypedSqlQuery<Info['schemas']['select']> {
    options = this.getOptions(options)

    return sql.type(this.selectSchema)`
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
    rows: ValueOrArray<z.infer<Info['schemas']['insert']>>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ) {
    options = this.getOptions(options)

    // special case: we're given a single empty row or an array with one entry
    // that is an empty row
    // unfortunately i don't *think* we can do this if we're given numerous
    // empty rows.
    if (
      this.isEmptyObject(rows) ||
      (Array.isArray(rows) && rows.length === 1 && this.isEmptyObject(rows[0]))
    ) {
      return this.insertDefaultValues(options)
    }

    const rowsArray = Array.isArray(rows) ? rows : [rows]

    if (rowsArray.length === 0) {
      throw new Error('insert requires at least one row')
    }

    if (this.isUniformRowset(rowsArray)) {
      return this.insertUniform(rowsArray, options)
    }

    return this.insertNonUniform(rowsArray, options)
  }

  public update(
    values: z.infer<Info['schemas']['update']>,
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ): TypedSqlQuery<Info['schemas']['select']> {
    options = this.getOptions(options)

    const updateQuery = sql.type(this.selectSchema)`
      UPDATE ${this.identifier()}
      ${this.set(values)}
      ${options.where ? this.where(options.where) : EMPTY}
      RETURNING *
    `
    return this.wrapCte('update', updateQuery, options, this.selectSchema)
  }

  public delete(
    options: QueryOptions<z.infer<Info['schemas']['select']>> | true
  ): TypedSqlQuery<Info['schemas']['select']> {
    const force = options === true
    options = this.getOptions(options === true ? {} : options)

    if (!force && !options.where) {
      throw new Error(
        'Implicit deletion of everything is not allowed. ' +
          'To delete everything, please pass `true` or include options.'
      )
    }

    const deleteQuery = sql.type(this.selectSchema)`
      DELETE FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
      RETURNING *
    `
    return this.wrapCte('delete', deleteQuery, options, this.selectSchema)
  }

  public count(
    options?: Omit<
      QueryOptions<z.infer<Info['schemas']['select']>>,
      'orderBy' | 'groupBy' | 'limit' | 'having'
    >
  ) {
    options = this.getOptions(options)

    return sql.type(COUNT_SCHEMA)`
      SELECT COUNT(*)
      FROM ${this.identifier()}
      ${options.where ? this.where(options.where) : EMPTY}
    `
  }

  public countGroup<
    TGroup extends Array<string & keyof z.infer<Info['schemas']['select']>>
  >(
    groupColumns: TGroup & Array<keyof z.infer<Info['schemas']['select']>>,
    options?: Omit<
      QueryOptions<z.infer<Info['schemas']['select']>>,
      'orderBy' | 'groupBy' | 'limit' | 'having'
    >
  ) {
    options = this.getOptions(options)

    const mask = groupColumns.reduce(
      (res, key) => ({ ...res, [key]: true }),
      {} as Record<keyof Info['schemas']['select'], true>
    )

    const columns = this.columnList(groupColumns)

    return sql.type(COUNT_SCHEMA.merge(this.selectSchema.pick(mask)))`
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
    rawConditions:
      | Conditions<z.infer<Info['schemas']['select']>>
      | FragmentSqlToken[]
      | FragmentSqlToken
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
    rawConditions:
      | Conditions<z.infer<Info['schemas']['select']>>
      | FragmentSqlToken[]
      | FragmentSqlToken
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
    rawConditions:
      | Conditions<z.infer<Info['schemas']['select']>>
      | FragmentSqlToken[]
  ): FragmentSqlToken {
    const conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql.fragment`true`
    }

    return sql.fragment`(${sql.join(conditions, sql.fragment` AND `)})`
  }

  public or(
    rawConditions:
      | Conditions<z.infer<Info['schemas']['select']>>
      | FragmentSqlToken[]
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

  protected wrapCte<QuerySchema extends z.ZodSchema>(
    queryName: string,
    query: TypedSqlQuery<QuerySchema>,
    options: Omit<QueryOptions<z.infer<Info['schemas']['select']>>, 'where'>,
    schema: QuerySchema
  ): TypedSqlQuery<QuerySchema> {
    const queryId = this.identifier(queryName + '_rows', false)

    return sql.type(schema)`
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
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ) {
    options = this.getOptions(options)

    const insertQuery = sql.type(this.selectSchema)`
      INSERT INTO ${this.identifier()}
      DEFAULT VALUES
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options, this.selectSchema)
  }

  protected insertUniform(
    rows: z.infer<Info['schemas']['select']>[],
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
  ) {
    options = this.getOptions(options)

    const columns = this.rowsetKeys(rows)
    const columnExpression = sql.join(
      columns.map((c) => this.identifier(c, false)),
      sql.fragment`, `
    )

    const tableExpression = columns.map<FragmentSqlToken>((column) => {
      return sql.fragment`${sql.identifier([column])} ${raw(
        this.metadata[column].nativeType
      )}`
    })

    const insertQuery = sql.type(this.selectSchema)`
      INSERT INTO ${this.identifier()} (${columnExpression})
      SELECT *
      FROM json_to_recordset(${sql.json(rows)}) AS (${sql.join(
      tableExpression,
      sql.fragment`, `
    )})
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options, this.selectSchema)
  }

  protected insertNonUniform(
    rows: z.infer<Info['schemas']['insert']>[],
    options?: QueryOptions<z.infer<Info['schemas']['select']>>
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

    const insertQuery = sql.type(this.selectSchema)`
      INSERT INTO ${this.identifier()} (${columnExpression})
      VALUES ${sql.join(rowExpressions, sql.fragment`, `)}
      RETURNING *
    `

    return this.wrapCte('insert', insertQuery, options, this.selectSchema)
  }

  protected conditions(
    conditions:
      | Conditions<z.infer<Info['schemas']['select']>>
      | FragmentSqlToken[]
  ): FragmentSqlToken[] {
    if (conditions.constructor === Array) {
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
              this.metadata[column as keyof z.infer<Info['schemas']['select']>]
                .nativeType
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

  protected set(values: z.infer<Info['schemas']['update']>): FragmentSqlToken {
    const pairs = Object.entries(values)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<FragmentSqlToken>(([column, value]) => {
        return sql.fragment`${this.identifier(
          column,
          false
        )} = ${this.valueToSql(value as SqlToken | SerializableValueType)}`
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
    TColumnNames extends Array<
      keyof z.infer<Info['schemas']['select']> & string
    >
  >(
    args: ReadonlyArray<
      Record<
        TColumnNames[0],
        z.infer<Info['schemas']['select']>[TColumnNames[0]]
      >
    >,
    columns: TColumnNames,
    types: string[],
    options?: QueryOptions<z.infer<Info['schemas']['select']>> & SelectOptions
  ) {
    options = this.getOptions(options)
    const typedColumns = this.jsonTypedColumns(columns, types)
    return sql.type(this.selectSchema)`
      SELECT ${this.identifier()}.*
      FROM ${this.identifier()},
      ${this.jsonRowComparison(
        args as ReadonlyArray<Partial<z.infer<Info['schemas']['select']>>>,
        typedColumns
      )}
      WHERE ${this.columnConditionsMap(columns, types)}
      ${options.groupBy ? this.groupBy(options.groupBy) : EMPTY}
      ${options.orderBy ? this.orderBy(options.orderBy) : EMPTY}
      ${options.limit ? this.limit(options.limit) : EMPTY}
      ${options.forUpdate ? this.forUpdate(options.forUpdate) : EMPTY}
    `
  }

  private jsonTypedColumns<
    TColumnNames extends Array<
      keyof z.infer<Info['schemas']['select']> & string
    >
  >(columns: TColumnNames, types: string[]): FragmentSqlToken {
    return sql.fragment`${sql.join(
      columns.map((columnName, idx) => {
        const column = this.metadata[columnName].nativeName
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
    args: ReadonlyArray<Partial<z.infer<Info['schemas']['select']>>>,
    typedColumns: FragmentSqlToken
  ) {
    const jsonObject: SerializableValue[] = args.map((entry) =>
      Object.entries(entry).reduce((result, [key, value]) => {
        return {
          ...result,
          [this.metadata[key].nativeName]: value as SerializableValue,
        }
      }, {} as object & SerializableValue)
    )
    return sql.fragment`
      (
        SELECT ${typedColumns}
        FROM json_array_elements(${sql.json(jsonObject)}) AS conditions
      ) AS ${this.identifier(`${this.table}_${CONDITIONS_TABLE}`, false)}
    `
  }

  private columnConditionsMap(
    columns: Array<keyof z.infer<Info['schemas']['select']> & string>,
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

  private isEmptyObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && Object.keys(value).length === 0
  }

  private valueToSql(
    rawValue: SerializableValueType | SqlToken | symbol
  ): FragmentSqlToken {
    if (isSqlToken(rawValue)) {
      return sql.fragment`${rawValue}`
    } else if (rawValue === this.defaultSymbol) {
      return sql.fragment`DEFAULT`
    } else if (typeof rawValue === 'symbol') {
      rawValue = rawValue.toString()
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
    rows: z.infer<Info['schemas']['insert']>[]
  ): Array<
    keyof z.infer<Info['schemas']['select']> &
      keyof z.infer<Info['schemas']['select']> &
      string
  > {
    const allKeys = rows.map(Object.keys)
    const keySet = new Set(...allKeys) as Set<
      keyof z.infer<Info['schemas']['select']> &
        keyof z.infer<Info['schemas']['select']> &
        string
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
    rowset: z.infer<Info['schemas']['insert']>[]
  ): rowset is z.infer<Info['schemas']['select']>[] {
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
