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
  | ValueOrArray<Date | null>
  | null
  | undefined
  | SqlTokenType
>

export type Arrayify<T> =
  T extends string | number | boolean | Date | null
  ? T extends string | number | boolean | Date
  ? ValueOrArray<T | null>
  : never
  : T extends string | number | boolean | Date
  ? ValueOrArray<T>
  : never

export type Conditions<TRowType> = {
  [K in keyof TRowType]?: Arrayify<TRowType[K]> | SqlTokenType | undefined
} & GenericConditions

export type GenericSet = Record<
  string,
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | SqlTokenType
>

export type UpdateSet<TRowType> = {
  [K in keyof TRowType]?: (
    TRowType[K] extends string | number | boolean | Date | null | undefined
    ? TRowType[K]
    : never
  ) | SqlTokenType
} & GenericSet

export type ColumnListEntry = string | IdentifierSqlTokenType | SqlSqlTokenType
export type ColumnList = ValueOrArray<ColumnListEntry>

export type OrderTuple = [ColumnListEntry] | [ColumnListEntry, 'ASC' | 'DESC' | undefined | SqlSqlTokenType];
export type OrderColumnList = ValueOrArray<ColumnListEntry | OrderTuple>;

export type AllowSql<T> = {
  [K in keyof T]?: T[K] | SqlTokenType
}

export interface CountQueryRowType {
  count: number
}

export type LimitClause = number | 'ALL' | SqlSqlTokenType | [number | 'ALL', number]
