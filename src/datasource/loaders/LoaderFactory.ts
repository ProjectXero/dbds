import DataLoader from 'dataloader'

import { GetDataFunction, LoaderFactoryOptions, LoaderOptions, SearchableKeys } from './types'
import { identity, match } from './utils'

export default class LoaderFactory<TRowType extends { [column: string]: unknown }> {
  private defaultOptions: LoaderFactoryOptions = {
    columnToKey: identity,
    keyToColumn: identity,
  }
  private options: LoaderFactoryOptions

  constructor(private getData: GetDataFunction<TRowType>, options?: Partial<LoaderFactoryOptions>) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    }
  }

  public create<TColumnName extends SearchableKeys<TRowType>>(
    key: TColumnName,
    columnType: string,
    options: LoaderOptions<TRowType, TColumnName> & {
      multi: true,
    }
  ): DataLoader<TRowType[TColumnName], TRowType[]>
  public create<TColumnName extends SearchableKeys<TRowType>>(
    key: TColumnName,
    columnType: string,
    options?: LoaderOptions<TRowType, TColumnName> & {
      multi?: false,
    }
  ): DataLoader<TRowType[TColumnName], TRowType | undefined>
  public create<TColumnName extends SearchableKeys<TRowType>, TColType extends string | number & TRowType[TColumnName]>(
    key: TColumnName,
    columnType: string,
    {
      multi = false,
      ignoreCase = false,
      callbackFn,
    }: LoaderOptions<TRowType, TColumnName> = {}
  ): DataLoader<TColType, TRowType[] | TRowType | undefined> {
    return new DataLoader<TColType, TRowType[] | (TRowType | undefined)>(
      async (args: readonly TColType[]) => {
        const data = await this.getData<TColType>(
          args,
          this.options.keyToColumn(key),
          columnType
        )
        callbackFn && data.forEach(callbackFn)
        return args.map((value) => {
          if (multi) {
            return data.filter((row) => match(value, row[key] as TColType, ignoreCase))
          }

          return data.find((row) => match(value, row[key] as TColType, ignoreCase))
        })
      }
    )
  }
}
