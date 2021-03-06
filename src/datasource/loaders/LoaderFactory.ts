import DataLoader from 'dataloader'

import {
  GetDataFunction,
  LoaderFactoryOptions,
  LoaderOptions,
  SearchableKeys,
} from './types'
import { identity, match } from './utils'

export type ExtendedDataLoader<
  TMulti extends boolean,
  K,
  V,
  C = K
> = DataLoader<K, V, C> & {
  isMultiLoader: TMulti
}

export default class LoaderFactory<TRowType> {
  private defaultOptions = {
    columnToKey: identity,
    keyToColumn: identity,
  }
  private options: Required<LoaderFactoryOptions<TRowType>>

  constructor(
    private getData: GetDataFunction<TRowType>,
    options: LoaderFactoryOptions<TRowType>
  ) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    }
  }

  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType:
      | string
      | (LoaderOptions<TRowType, TColumnName> & {
          multi: true
        }),
    options?: LoaderOptions<TRowType, TColumnName> & {
      multi: true
    }
  ): ExtendedDataLoader<true, TRowType[TColumnName], TRowType[]>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType?:
      | string
      | (LoaderOptions<TRowType, TColumnName> & {
          multi?: false
        }),
    options?: LoaderOptions<TRowType, TColumnName> & {
      multi?: false
    }
  ): ExtendedDataLoader<false, TRowType[TColumnName], TRowType | undefined>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string,
    TColType extends TRowType[TColumnName] & (string | number)
  >(
    key: TColumnName,
    columnType?: string | LoaderOptions<TRowType, TColumnName>,
    options?: LoaderOptions<TRowType, TColumnName>
  ): DataLoader<TColType, TRowType[] | TRowType | undefined> {
    if (typeof columnType === 'object') {
      options = columnType
      columnType = undefined
    } else if (typeof options === 'undefined') {
      options = {}
    }

    const getData = options.getData || this.getData

    const type: string = columnType || this.options.columnTypes[key]

    const { multi = false, ignoreCase = false, callbackFn } = options

    const loader = new DataLoader<
      TColType,
      TRowType[] | (TRowType | undefined)
    >(async (args: readonly TColType[]) => {
      const data = await getData<TColumnName>(args, key, type, options)
      callbackFn && data.forEach(callbackFn)
      return args.map((value) => {
        if (multi) {
          return data.filter((row) =>
            match(value, row[key] as TColType, ignoreCase)
          )
        }

        return data.find((row) =>
          match(value, row[key] as TColType, ignoreCase)
        )
      })
    }) as ExtendedDataLoader<
      typeof multi,
      TColType,
      TRowType[] | (TRowType | undefined)
    >
    loader.isMultiLoader = multi
    return loader
  }
}
