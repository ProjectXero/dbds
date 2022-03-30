import { QueryOptions } from '../queries/QueryBuilder'

export type SearchableKeys<T, SearchableType = string | number | null> = {
  [K in keyof T]?: T extends { [_ in K]?: SearchableType } ? K : never
}[keyof T]

export interface GetDataFunction<TRowType> {
  <TColumnName extends keyof TRowType & string>(
    args: Array<TRowType[TColumnName]> | ReadonlyArray<TRowType[TColumnName]>,
    column: TColumnName,
    type: string,
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
    options?: QueryOptions<TRowType>
  ): readonly TRowType[] | Promise<readonly TRowType[]>
}

export interface LoaderFactoryOptions<TRowType> {
  columnToKey?: (column: string) => string
  keyToColumn?: (column: string) => string
  columnTypes: Record<keyof TRowType, string>
}

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
} & QueryOptions<TRowType>

export type FinderOptions = {
  multi?: boolean
}
