import { IdentifierSqlTokenType, SqlSqlTokenType, SqlTokenType } from "slonik"

export type { ValueExpressionType } from "slonik"

export type PrimitiveValueType = string | number | boolean | null
export type ValueType =
  | PrimitiveValueType
  | Array<PrimitiveValueType>
  | ReadonlyArray<PrimitiveValueType>

export type ValueOrArray<T> = T | T[]

export type Nullable<T> = T | null

export type GenericConditions = Record<
  string,
  | ValueOrArray<string | null>
  | ValueOrArray<number | null>
  | ValueOrArray<boolean | null>
  | null
  | SqlTokenType
>

export type Arrayify<T> =
  T extends string | number | boolean | null
  ? T extends string | number | boolean
  ? ValueOrArray<T | null>
  : never
  : T extends string | number | boolean
  ? ValueOrArray<T>
  : never

export type Conditions<TRowType> = {
  [K in keyof TRowType]?: Arrayify<TRowType[K]> | SqlTokenType
} & GenericConditions

export type GenericSet = Record<
  string,
  | string
  | number
  | boolean
  | null
  | SqlTokenType
>

export type UpdateSet<TRowType> = {
  [K in keyof TRowType]?: (
    TRowType[K] extends string | number | boolean | null | undefined
    ? TRowType[K]
    : never
  ) | SqlTokenType
} & GenericSet

export type ColumnListEntry = string | IdentifierSqlTokenType | SqlSqlTokenType
export type ColumnList = ColumnListEntry | Array<ColumnListEntry> | ReadonlyArray<ColumnListEntry>

export type AllowSql<T> = {
  [K in keyof T]?: T[K] | SqlTokenType
}
