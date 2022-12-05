import { PrimitiveValueExpression } from 'slonik'

export type TypedSqlQuery<T> = Readonly<{
  parser: T
  type: 'SLONIK_TOKEN_QUERY'
  sql: string
  values: PrimitiveValueExpression[]
}>
