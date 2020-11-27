import { SqlSqlTokenType } from "slonik"

export type PrimitiveValueType = string | number | boolean | null
export type ValueType =
  | PrimitiveValueType
  | Array<PrimitiveValueType>
  | ReadonlyArray<PrimitiveValueType>

export type ConditionValue<T extends string | number | boolean> = T | null | Array<T | null>

export type GenericConditions = Record<string, ConditionValue<string> | ConditionValue<number> | ConditionValue<boolean> | SqlSqlTokenType>

export type Conditions<TRowType> = {
  [K in keyof TRowType]?: TRowType[K] extends string
  ? ConditionValue<string>
  : TRowType[K] extends number
  ? ConditionValue<number>
  : TRowType[K] extends boolean
  ? ConditionValue<boolean>
  : SqlSqlTokenType
} & GenericConditions
