import {
  IdentifierSqlToken,
  SqlSqlToken,
  isSqlToken as isSlonikToken,
  SqlToken,
} from 'slonik'
import { OrderTuple } from './types'

export const isSqlToken = (subject: unknown): subject is SqlToken => {
  return isSlonikToken(subject)
}

export const isSqlSqlToken = (v: unknown): v is SqlSqlToken => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'sql') &&
    Object.prototype.hasOwnProperty.call(v, 'type') &&
    Object.prototype.hasOwnProperty.call(v, 'values')
  )
}

export const isIdentifierSqlToken = (v: unknown): v is IdentifierSqlToken => {
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
      isIdentifierSqlToken(v[0]) ||
      isSqlSqlToken(v[0]))
  )
}
