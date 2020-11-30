export type SearchableKeys<T, SearchableType = string | number | null> = {
  [K in keyof T]?: T extends { [_ in K]?: SearchableType } ? K : never
}[keyof T]

export interface GetDataFunction<TRowType> {
  <TColType extends string | number>(
    args: TColType[] | readonly TColType[],
    column: string,
    type: string
  ): readonly TRowType[] | Promise<readonly TRowType[]>
}

export interface LoaderFactoryOptions<TRowType> {
  columnToKey?: (column: string) => string
  keyToColumn?: (column: string) => string
  columnTypes: Record<keyof TRowType, string>
}

export type LoaderOptions<TRowType, TColumnName extends keyof TRowType> = {
  multi?: boolean
  ignoreCase?: TRowType extends Record<TColumnName, string> ? boolean : false | undefined
  callbackFn?: (row: TRowType, index: number, array: readonly TRowType[]) => void
}
