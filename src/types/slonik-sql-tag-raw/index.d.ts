declare module 'slonik-sql-tag-raw' {
  import type { ValueExpressionType, SqlSqlTokenType } from 'slonik'

  export function raw(
    sql: string,
    values?: ReadonlyArray<ValueExpressionType>
  ): SqlSqlTokenType
}
