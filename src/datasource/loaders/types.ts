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

export interface LoaderFactoryOptions<TRowType> {
  columnToKey?: (column: string) => string
  keyToColumn?: (column: string) => string
  columnTypes: Record<keyof TRowType, string>
}

export type LoaderOptions<TRowType, TColumnName extends keyof TRowType> = {
  getData?: GetDataFunction<TRowType>
  multi?: boolean
  ignoreCase?: TRowType extends Record<TColumnName, string>
    ? boolean
    : false | undefined
  callbackFn?: (
    row: TRowType,
    index: number,
    array: readonly TRowType[]
  ) => void
} & QueryOptions<TRowType>

export type FinderOptions = {
  multi?: boolean
}
