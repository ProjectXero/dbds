import { IdentifierSqlToken, FragmentSqlToken, SqlToken } from 'slonik'

export type { ValueExpression } from 'slonik'

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
  | SqlToken
>

export type Conditions<TRowType> = {
  [K in keyof TRowType]?:
    | TRowType[K]
    | Array<TRowType[K]>
    | SqlToken
    | undefined
} & GenericConditions

export type GenericSet = Record<
  string,
  SerializableValueType | SqlToken | undefined
>

export type UpdateSet<TRowType> = {
  [K in keyof TRowType]?: TRowType[K] | SqlToken
} & GenericSet

export type ColumnListEntry = string | IdentifierSqlToken | FragmentSqlToken
export type ColumnList = ValueOrArray<ColumnListEntry>

export type OrderTuple =
  | [ColumnListEntry]
  | [ColumnListEntry, 'ASC' | 'DESC' | undefined | FragmentSqlToken]
export type OrderColumnList = ValueOrArray<ColumnListEntry | OrderTuple>

export type AllowSql<T> = {
  [K in keyof T]?: T[K] | SqlToken
}

export interface CountQueryRowType {
  count: number
}

export type LimitClause =
  | number
  | 'ALL'
  | FragmentSqlToken
  | [number | 'ALL', number]
