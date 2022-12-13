import { PrimitiveValueExpression } from 'slonik'
import { z } from 'zod'

export type TypedSqlQuery<T extends z.ZodTypeAny> = Readonly<{
  parser: T
  type: 'SLONIK_TOKEN_QUERY'
  sql: string
  values: PrimitiveValueExpression[]
}>
