import { IdentifierSqlTokenType, SqlSqlTokenType, SqlTokenType } from 'slonik'

export type { ValueExpressionType } from 'slonik'

export type PrimitiveValueType = string | number | boolean | null
export type SimpleValueType = PrimitiveValueType | Date
export type SerializableValueType =
  | SimpleValueType
  | {
      [key in string]: SerializableValueType | undefined
    }
  | Array<SerializableValueType>
  | ReadonlyArray<SerializableValueType>

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

export type Conditions<TRowType> = {
  [K in keyof TRowType]?:
    | TRowType[K]
    | Array<TRowType[K]>
    | SqlTokenType
    | undefined
} &
  GenericConditions

export type GenericSet = Record<
  string,
  SerializableValueType | SqlTokenType | undefined
>

export type UpdateSet<TRowType> = {
  [K in keyof TRowType]?:
    | (TRowType[K] extends SerializableValueType | undefined
        ? TRowType[K]
        : never)
    | SqlTokenType
} &
  GenericSet

export type ColumnListEntry = string | IdentifierSqlTokenType | SqlSqlTokenType
export type ColumnList = ValueOrArray<ColumnListEntry>

export type OrderTuple =
  | [ColumnListEntry]
  | [ColumnListEntry, 'ASC' | 'DESC' | undefined | SqlSqlTokenType]
export type OrderColumnList = ValueOrArray<ColumnListEntry | OrderTuple>

export type AllowSql<T> = {
  [K in keyof T]?: T[K] | SqlTokenType
}

export interface CountQueryRowType {
  count: number
}

export type LimitClause =
  | number
  | 'ALL'
  | SqlSqlTokenType
  | [number | 'ALL', number]
