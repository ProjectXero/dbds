import DataLoader from 'dataloader'

import {
  GetDataFunction,
  GetDataMultiFunction,
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

export type BatchKeyType<
  TRowType,
  TColumnNames extends
    | (keyof TRowType & keyof TRowType & string)
    | Array<keyof TRowType & keyof TRowType & string>
> = TColumnNames extends Array<keyof TRowType>
  ? Record<TColumnNames[0], TRowType[TColumnNames[0] & (string | number)]>
  : TRowType[TColumnNames & keyof TRowType & string]

export default class LoaderFactory<TRowType> {
  private defaultOptions = {
    columnToKey: identity,
    keyToColumn: identity,
  }
  private options: Required<LoaderFactoryOptions<TRowType>>

  constructor(
    private getData: GetDataFunction<TRowType>,
    private getDataMulti: GetDataMultiFunction<TRowType>,
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
    options: LoaderOptions<TRowType> & {
      multi: true
    }
  ): ExtendedDataLoader<true, TRowType[TColumnName], TRowType[]>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType: string,
    options: LoaderOptions<TRowType> & {
      multi: true
    }
  ): ExtendedDataLoader<true, TRowType[TColumnName], TRowType[]>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    options?: LoaderOptions<TRowType> & {
      multi?: false
    }
  ): ExtendedDataLoader<false, TRowType[TColumnName], TRowType | undefined>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType?: string,
    options?: LoaderOptions<TRowType> & {
      multi?: false
    }
  ): ExtendedDataLoader<false, TRowType[TColumnName], TRowType | undefined>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string,
    TColType extends TRowType[TColumnName] & (string | number)
  >(
    key: TColumnName,
    columnType?: string | LoaderOptions<TRowType>,
    options?: LoaderOptions<TRowType>
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

  public createMulti<
    TColumnNames extends Array<
      SearchableKeys<TRowType> & keyof TRowType & string
    >,
    TBatchKey extends {
      [K in TColumnNames[0]]: TRowType[K]
    }
  >(
    key: TColumnNames,
    options: LoaderOptions<TRowType, true> & {
      multi: true
    }
  ): ExtendedDataLoader<true, TBatchKey, TRowType[]>
  public createMulti<
    TColumnNames extends Array<
      SearchableKeys<TRowType> & keyof TRowType & string
    >,
    TBatchKey extends {
      [K in TColumnNames[0]]: TRowType[K]
    }
  >(
    key: TColumnNames,
    columnTypes: string[],
    options: LoaderOptions<TRowType, true> & {
      multi: true
    }
  ): ExtendedDataLoader<true, TBatchKey, TRowType[]>
  public createMulti<
    TColumnNames extends Array<
      SearchableKeys<TRowType> & keyof TRowType & string
    >,
    TBatchKey extends {
      [K in TColumnNames[0]]: TRowType[K]
    }
  >(
    key: TColumnNames,
    options?: LoaderOptions<TRowType, true> & {
      multi?: false
    }
  ): ExtendedDataLoader<false, TBatchKey, TRowType | undefined>
  public createMulti<
    TColumnNames extends Array<
      SearchableKeys<TRowType> & keyof TRowType & string
    >,
    TBatchKey extends {
      [K in TColumnNames[0]]: TRowType[K]
    }
  >(
    key: TColumnNames,
    columnTypes?: string[],
    options?: LoaderOptions<TRowType, true> & {
      multi?: false
    }
  ): ExtendedDataLoader<false, TBatchKey, TRowType | undefined>
  public createMulti<
    TColumnNames extends Array<
      SearchableKeys<TRowType> & keyof TRowType & string
    >,
    TBatchKey extends {
      [K in TColumnNames[0]]: TRowType[K]
    }
  >(
    keys: TColumnNames,
    columnTypes?: string[] | LoaderOptions<TRowType, true>,
    options?: LoaderOptions<TRowType, true>
  ): DataLoader<TBatchKey, TRowType[] | TRowType | undefined> {
    if (typeof columnTypes === 'object' && !Array.isArray(columnTypes)) {
      options = columnTypes
      columnTypes = undefined
    } else if (typeof options === 'undefined') {
      options = {}
    }

    const getData = options.getData || this.getDataMulti

    const types: string[] =
      columnTypes || keys.map((key) => this.options.columnTypes[key])

    if (types.length !== keys.length) {
      throw new Error('Same number of types and keys must be provided')
    }

    const cacheKeyFn = (batchKey: TBatchKey): string =>
      keys.map((key) => batchKey[key]).join(':')

    const { multi = false, ignoreCase = false, callbackFn } = options

    const loader = new DataLoader<
      TBatchKey,
      TRowType[] | (TRowType | undefined),
      string
    >(
      async (args: readonly TBatchKey[]) => {
        const data = await getData<TColumnNames, TBatchKey>(
          args,
          keys,
          types,
          options
        )
        callbackFn && data.forEach(callbackFn)
        return args.map((batchKey) => {
          const callback = (row: TRowType) => {
            return Object.entries(batchKey).every(([key, value]) =>
              match(
                value as string | number,
                row[key as keyof TRowType],
                ignoreCase
              )
            )
          }
          if (multi) {
            return data.filter(callback)
          }

          return data.find(callback)
        })
      },
      { cacheKeyFn }
    ) as ExtendedDataLoader<
      typeof multi,
      TBatchKey,
      TRowType[] | (TRowType | undefined)
    >
    loader.isMultiLoader = multi
    return loader
  }
}
