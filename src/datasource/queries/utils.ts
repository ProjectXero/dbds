import {
  IdentifierSqlTokenType,
  SqlSqlTokenType,
  isSqlToken as isSlonikToken,
  SqlTokenType,
} from 'slonik'
import { OrderTuple } from './types'

export const isSqlToken = (subject: unknown): subject is SqlTokenType => {
  return isSlonikToken(subject)
}

export const isSqlSqlTokenType = (v: unknown): v is SqlSqlTokenType => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'sql') &&
    Object.prototype.hasOwnProperty.call(v, 'type') &&
    Object.prototype.hasOwnProperty.call(v, 'values')
  )
}

export const isIdentifierSqlTokenType = (
  v: unknown
): v is IdentifierSqlTokenType => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'names') &&
    Object.prototype.hasOwnProperty.call(v, 'type')
  )
}

export const isOrderTuple = (v: unknown): v is OrderTuple => {
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
