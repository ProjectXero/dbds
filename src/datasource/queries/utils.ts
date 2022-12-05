import {
  IdentifierSqlToken,
  FragmentSqlToken,
  isSqlToken as isSlonikToken,
  SqlToken,
} from 'slonik'
import { FragmentToken } from 'slonik/dist/src/tokens'
import { OrderTuple } from './types'

export const isSqlToken = (subject: unknown): subject is SqlToken => {
  return isSlonikToken(subject)
}

export const isFragmentSqlToken = (v: unknown): v is FragmentSqlToken => {
  return (
    typeof v === 'object' &&
    Object.prototype.hasOwnProperty.call(v, 'sql') &&
    Object.prototype.hasOwnProperty.call(v, 'type') &&
    Object.prototype.hasOwnProperty.call(v, 'values') &&
    (v as FragmentSqlToken).type === FragmentToken
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
      isFragmentSqlToken(v[0]))
  )
}
