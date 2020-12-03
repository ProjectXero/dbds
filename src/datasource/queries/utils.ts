import {
  IdentifierSqlTokenType,
  SqlSqlTokenType,
  isSqlToken as a,
  SqlTokenType,
} from 'slonik'
import { OrderTuple } from './types'

export const isSqlToken = (subject: any): subject is SqlTokenType => {
  return a(subject)
}

export const isSqlSqlTokenType = (v: any): v is SqlSqlTokenType => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'sql') &&
    Object.prototype.hasOwnProperty.call(v, 'type') &&
    Object.prototype.hasOwnProperty.call(v, 'values')
  )
}

export const isIdentifierSqlTokenType = (
  v: any
): v is IdentifierSqlTokenType => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'names') &&
    Object.prototype.hasOwnProperty.call(v, 'type')
  )
}

export const isOrderTuple = (v: any): v is OrderTuple => {
  return (
    Array.isArray(v) &&
    v.length >= 1 &&
    v.length <= 2 &&
    (v[1] === 'ASC' || v[1] === 'DESC') &&
    (typeof v[0] === 'string' ||
      isIdentifierSqlTokenType(v[0]) ||
      isSqlSqlTokenType(v[0]))
  )
}
