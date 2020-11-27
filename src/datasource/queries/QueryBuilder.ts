import {
  IdentifierSqlTokenType,
  sql,
  SqlSqlTokenType,
  SqlTokenType,
} from "slonik";
import { raw } from "slonik-sql-tag-raw";

import { ColumnList, Conditions, GenericConditions } from "./types";
import { isSqlSqlTokenType } from "./utils";

export interface QueryOptions<TRowType> {
  where?: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
  groupBy?: ColumnList
  orderBy?: ColumnList
  having?: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType
}

export default class QueryBuilder<TRowType> {
  constructor(public readonly table: string, protected readonly columnTypes?: Record<keyof TRowType, string>) { }

  public identifier(column?: string): IdentifierSqlTokenType {
    const params = [this.table]
    column !== undefined && params.push(column)
    return sql.identifier(params)
  }

  /* Public clause builders */

  /**
   * Generate a WHERE clause
   * @param rawConditions Conditions expression
   */
  public where(rawConditions: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType): SqlSqlTokenType {
    let conditions = isSqlSqlTokenType(rawConditions) ? rawConditions : this.and(rawConditions)

    return sql`WHERE ${conditions}`
  }

  public orderBy(...columns: Array<ColumnList>): SqlSqlTokenType {
    const list = this.columnList(...columns)

    return sql`ORDER BY ${sql.join(list, sql`, `)}`
  }

  public groupBy(...columns: Array<ColumnList>): SqlSqlTokenType {
    const list = this.columnList(...columns)

    return sql`GROUP BY ${sql.join(list, sql`, `)}`
  }

  public having(rawConditions: Conditions<TRowType> | SqlSqlTokenType[] | SqlSqlTokenType): SqlSqlTokenType {
    let conditions = isSqlSqlTokenType(rawConditions) ? rawConditions : this.and(rawConditions)

    return sql`HAVING ${conditions}`
  }

  /* Public query-building utilities */

  public and(rawConditions: Conditions<TRowType> | SqlSqlTokenType[]): SqlSqlTokenType {
    let conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql`true`
    }

    return sql`(${sql.join(conditions, sql` AND `)})`
  }

  public or(rawConditions: Conditions<TRowType> | SqlSqlTokenType[]): SqlSqlTokenType {
    let conditions = this.conditions(rawConditions)

    if (conditions.length == 0) {
      return sql`true`
    }

    return sql`(${sql.join(conditions, sql` OR `)})`
  }

  public any(values: (string | null)[] | (number | null)[] | (boolean | null)[], type: string) {
    return sql`ANY(${sql.array(values, sql`${raw(type)}[]`)})`
  }

  /* Protected query-building utilities */

  protected conditions(conditions: Conditions<TRowType> | SqlSqlTokenType[]): SqlSqlTokenType[] {
    if (Array.isArray(conditions)) {
      return conditions
    }

    return Object.entries(conditions as GenericConditions)
      .filter(([column, value]) => column !== undefined && value !== undefined)
      .map<SqlSqlTokenType>(([column, value]) => {
        let sqlValue: SqlSqlTokenType
        if (value === null || typeof value !== 'object' || isSqlSqlTokenType(value)) {
          sqlValue = sql`${value}`
        } else {
          if (!this.columnTypes) {
            throw new TypeError('Cannot use array types as column types were not provided')
          }

          sqlValue = this.any(value, this.columnTypes[column as keyof TRowType])
        }

        return sql`${this.identifier(column)} = ${sqlValue}`
      })
  }

  protected columnList(...columns: Array<ColumnList>): SqlTokenType[] {
    return columns.flat().map<SqlTokenType>((column) => {
      if (typeof column === 'string') {
        return this.identifier(column)
      }
      return column
    })
  }
}
