import DataLoader from 'dataloader'
import { QueryOptions } from '../queries/QueryBuilder'

import {
  ExtendedDataLoader,
  GetDataFunction,
  GetDataMultiFunction,
  LoaderFactoryOptions,
  LoaderOptions,
  SearchableKeys,
} from './types'
import { identity, match } from './utils'

export default class LoaderFactory<TRowType> {
  private defaultOptions = {
    columnToKey: identity,
    keyToColumn: identity,
  }
  private options: Required<LoaderFactoryOptions<TRowType>>

  protected loaders: Array<
    ExtendedDataLoader<boolean, unknown, TRowType[] | TRowType | undefined>
  > = []

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

  protected async autoPrimeLoaders(
    result: TRowType | undefined,
    loaders = this.loaders
  ): Promise<void> {
    if (!result) {
      // we can't auto-prime undefined results because we have no values to
      // prime on :(
      return
    }

    for (const loader of loaders) {
      if (loader.isMultiLoader) {
        // auto-priming multi-loaders is currently unsupported
        continue
      }

      if (typeof loader.columns === 'string') {
        loader.prime(result[loader.columns as keyof TRowType], result)
      } else {
        const key = loader.columns.reduce(
          (key, column) => ({
            ...key,
            [column]: result[column as keyof TRowType],
          }),
          {}
        )
        loader.prime(key, result)
      }
    }
  }

  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    options: LoaderOptions<TRowType> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TRowType>
  ): ExtendedDataLoader<true, TRowType[TColumnName], TRowType[]>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType: string,
    options: LoaderOptions<TRowType> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TRowType>
  ): ExtendedDataLoader<true, TRowType[TColumnName], TRowType[]>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    options?: LoaderOptions<TRowType> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TRowType>
  ): ExtendedDataLoader<false, TRowType[TColumnName], TRowType | undefined>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string
  >(
    key: TColumnName,
    columnType?: string,
    options?: LoaderOptions<TRowType> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TRowType>
  ): ExtendedDataLoader<false, TRowType[TColumnName], TRowType | undefined>
  public create<
    TColumnName extends SearchableKeys<TRowType> & keyof TRowType & string,
    TColType extends TRowType[TColumnName] & (string | number)
  >(
    key: TColumnName,
    columnType?: string | LoaderOptions<TRowType>,
    options?: LoaderOptions<TRowType> | (() => QueryOptions<TRowType>),
    queryOptions?: () => QueryOptions<TRowType>
  ): DataLoader<TColType, TRowType[] | TRowType | undefined> {
    if (typeof options === 'function') {
      queryOptions = options
      options = undefined
    }
    if (typeof columnType === 'object') {
      options = columnType
      columnType = undefined
    }

    const actualOptions = options || {}

    const getData = actualOptions.getData || this.getData

    const type: string = columnType || this.options.columnTypes[key]

    const {
      multi = false,
      ignoreCase = false,
      callbackFn,
      autoPrime,
      primeLoaders,
    } = actualOptions

    const loader = new DataLoader<
      TColType,
      TRowType[] | (TRowType | undefined)
    >(async (args: readonly TColType[]) => {
      const data = await getData<TColumnName>(args, key, type, loader, {
        ...actualOptions,
        ...queryOptions?.(),
      })

      data.forEach((row, idx, arr) => {
        callbackFn && callbackFn(row, idx, arr)
        autoPrime &&
          this.autoPrimeLoaders(
            row,
            typeof primeLoaders === 'function' ? primeLoaders() : primeLoaders
          )
      })

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
    loader.columns = key
    this.loaders.push(loader)
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
    },
    queryOptions?: () => QueryOptions<TRowType>
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
    },
    queryOptions?: () => QueryOptions<TRowType>
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
    },
    queryOptions?: () => QueryOptions<TRowType>
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
    },
    queryOptions?: () => QueryOptions<TRowType>
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
    options?: LoaderOptions<TRowType, true> | (() => QueryOptions<TRowType>),
    queryOptions?: () => QueryOptions<TRowType>
  ): DataLoader<TBatchKey, TRowType[] | TRowType | undefined> {
    if (typeof options === 'function') {
      queryOptions = options
      options = undefined
    }
    if (typeof columnTypes === 'object' && !Array.isArray(columnTypes)) {
      options = columnTypes
      columnTypes = undefined
    }

    const actualOptions = options || {}

    const getData = actualOptions.getData || this.getDataMulti

    const types: string[] =
      columnTypes || keys.map((key) => this.options.columnTypes[key])

    if (types.length !== keys.length) {
      throw new Error('Same number of types and keys must be provided')
    }

    const cacheKeyFn = (batchKey: TBatchKey): string =>
      keys.map((key) => batchKey[key]).join(':')

    const {
      multi = false,
      ignoreCase = false,
      callbackFn,
      autoPrime,
      primeLoaders,
    } = actualOptions

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
          loader,
          {
            ...actualOptions,
            ...queryOptions?.(),
          }
        )

        data.forEach((row, idx, arr) => {
          callbackFn && callbackFn(row, idx, arr)
          autoPrime &&
            this.autoPrimeLoaders(
              row,
              typeof primeLoaders === 'function' ? primeLoaders() : primeLoaders
            )
        })

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
      boolean,
      TBatchKey,
      TRowType[] | (TRowType | undefined)
    >
    loader.isMultiLoader = multi
    loader.columns = [...keys]
    this.loaders.push(loader)
    return loader
  }
}
