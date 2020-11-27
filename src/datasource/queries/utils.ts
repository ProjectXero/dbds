import { SqlSqlTokenType } from "slonik"

export const isSqlSqlTokenType = (v: any): v is SqlSqlTokenType => {
  return typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'sql') &&
    Object.prototype.hasOwnProperty.call(v, 'type') &&
    Object.prototype.hasOwnProperty.call(v, 'values')
}
