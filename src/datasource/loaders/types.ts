import type DataLoader from 'dataloader'
import type { QueryOptions } from '../queries/QueryBuilder'
import { TableMetadata } from '../types'

export type SearchableKeys<T, SearchableType = string | number | null> = {
  [K in keyof T]?: T extends { [_ in K]?: SearchableType } ? K : never
}[keyof T]

export interface GetDataFunction<TRowType> {
  <TColumnName extends keyof TRowType & string>(
    args: Array<TRowType[TColumnName]> | ReadonlyArray<TRowType[TColumnName]>,
    column: TColumnName,
    type: string,
    loader: DataLoader<
      TRowType[TColumnName] & (string | number),
      TRowType[] | (TRowType | undefined)
    >,
    options?: QueryOptions<TRowType>
  ): readonly TRowType[] | Promise<readonly TRowType[]>
}

export interface GetDataMultiFunction<TRowType> {
  <
    TColumnNames extends Array<keyof TRowType & string>,
    TArgs extends { [K in TColumnNames[0]]: TRowType[K] }
  >(
    args: Array<TArgs> | ReadonlyArray<TArgs>,
    columns: TColumnNames,
    types: string[],
    loader: DataLoader<TArgs, TRowType[] | (TRowType | undefined)>,
    options?: QueryOptions<TRowType>
  ): readonly TRowType[] | Promise<readonly TRowType[]>
}

export interface LoaderFactoryOptions<Schema> {
  columnToKey?: (column: string) => string
  keyToColumn?: (column: string) => string
  metadata: TableMetadata<string & keyof Schema>
}

export type ExtendedDataLoader<
  TMulti extends boolean,
  K,
  V,
  C = K
> = DataLoader<K, V, C> & {
  isMultiLoader: TMulti
  columns: string | string[]
}

export type BatchKeyType<
  TRowType,
  TColumnNames extends
    | (keyof TRowType & keyof TRowType & string)
    | Array<keyof TRowType & keyof TRowType & string>
> = TColumnNames extends Array<keyof TRowType>
  ? Record<TColumnNames[0], TRowType[TColumnNames[0] & (string | number)]>
  : TRowType[TColumnNames & keyof TRowType & string]

export type LoaderOptions<TRowType, IsMulti extends boolean = false> = {
  getData?: IsMulti extends true
    ? GetDataMultiFunction<TRowType>
    : GetDataFunction<TRowType>
  multi?: boolean
  ignoreCase?: boolean
  callbackFn?: (
    row: TRowType,
    index: number,
    array: readonly TRowType[]
  ) => void
  primeLoaders?:
    | Array<
        ExtendedDataLoader<boolean, unknown, TRowType[] | TRowType | undefined>
      >
    | (() => Array<
        ExtendedDataLoader<boolean, unknown, TRowType[] | TRowType | undefined>
      >)
  autoPrime?: boolean
} & QueryOptions<TRowType>

export type FinderOptions = {
  multi?: boolean
}
