import DataLoader from 'dataloader'
import { QueryOptions } from '../queries/QueryBuilder'
import { TableMetadata } from '../types'

import {
  ExtendedDataLoader,
  GetDataFunction,
  GetDataMultiFunction,
  LoaderOptions,
  // SearchableKeys,
} from './types'
import { match } from './utils'

export default class LoaderFactory<
  TableSchema,
  SearchableKeys extends string & keyof TableSchema = string & keyof TableSchema
> {
  protected loaders: Array<
    ExtendedDataLoader<
      boolean,
      unknown,
      TableSchema[] | TableSchema | undefined
    >
  > = []

  constructor(
    private getData: GetDataFunction<TableSchema>,
    private getDataMulti: GetDataMultiFunction<TableSchema>,
    private metadata: TableMetadata<SearchableKeys>
  ) {}

  protected async autoPrimeLoaders(
    result: TableSchema | undefined,
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
        loader.prime(result[loader.columns as keyof TableSchema], result)
      } else {
        const key = loader.columns.reduce(
          (key, column) => ({
            ...key,
            [column]: result[column as keyof TableSchema],
          }),
          {}
        )
        loader.prime(key, result)
      }
    }
  }

  public create<TColumnName extends SearchableKeys>(
    key: TColumnName,
    options: LoaderOptions<TableSchema> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<true, TableSchema[TColumnName], TableSchema[]>
  public create<TColumnName extends SearchableKeys>(
    key: TColumnName,
    columnType: string,
    options: LoaderOptions<TableSchema> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<true, TableSchema[TColumnName], TableSchema[]>
  public create<TColumnName extends SearchableKeys>(
    key: TColumnName,
    options?: LoaderOptions<TableSchema> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<
    false,
    TableSchema[TColumnName],
    TableSchema | undefined
  >
  public create<TColumnName extends SearchableKeys>(
    key: TColumnName,
    columnType?: string,
    options?: LoaderOptions<TableSchema> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<
    false,
    TableSchema[TColumnName],
    TableSchema | undefined
  >
  public create<
    TColumnName extends SearchableKeys,
    TColType extends TableSchema[TColumnName] & (string | number)
  >(
    key: TColumnName,
    columnType?: string | LoaderOptions<TableSchema>,
    options?: LoaderOptions<TableSchema> | (() => QueryOptions<TableSchema>),
    queryOptions?: () => QueryOptions<TableSchema>
  ): DataLoader<TColType, TableSchema[] | TableSchema | undefined> {
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

    const type: string = columnType || this.metadata[key].nativeType

    const {
      multi = false,
      ignoreCase = false,
      callbackFn,
      autoPrime,
      primeLoaders,
    } = actualOptions

    const loader = new DataLoader<
      TColType,
      TableSchema[] | (TableSchema | undefined)
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
      TableSchema[] | (TableSchema | undefined)
    >
    loader.isMultiLoader = multi
    loader.columns = key
    this.loaders.push(loader)
    return loader
  }

  public createMulti<
    TColumnNames extends Array<SearchableKeys>,
    TBatchKey extends {
      [K in TColumnNames[0]]: TableSchema[K]
    }
  >(
    key: TColumnNames,
    options: LoaderOptions<TableSchema, true> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<true, TBatchKey, TableSchema[]>
  public createMulti<
    TColumnNames extends Array<SearchableKeys>,
    TBatchKey extends {
      [K in TColumnNames[0]]: TableSchema[K]
    }
  >(
    key: TColumnNames,
    columnTypes: string[],
    options: LoaderOptions<TableSchema, true> & {
      multi: true
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<true, TBatchKey, TableSchema[]>
  public createMulti<
    TColumnNames extends Array<SearchableKeys>,
    TBatchKey extends {
      [K in TColumnNames[0]]: TableSchema[K]
    }
  >(
    key: TColumnNames,
    options?: LoaderOptions<TableSchema, true> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<false, TBatchKey, TableSchema | undefined>
  public createMulti<
    TColumnNames extends Array<SearchableKeys>,
    TBatchKey extends {
      [K in TColumnNames[0]]: TableSchema[K]
    }
  >(
    key: TColumnNames,
    columnTypes?: string[],
    options?: LoaderOptions<TableSchema, true> & {
      multi?: false
    },
    queryOptions?: () => QueryOptions<TableSchema>
  ): ExtendedDataLoader<false, TBatchKey, TableSchema | undefined>
  public createMulti<
    TColumnNames extends Array<SearchableKeys>,
    TBatchKey extends {
      [K in TColumnNames[0]]: TableSchema[K]
    }
  >(
    keys: TColumnNames,
    columnTypes?: string[] | LoaderOptions<TableSchema, true>,
    options?:
      | LoaderOptions<TableSchema, true>
      | (() => QueryOptions<TableSchema>),
    queryOptions?: () => QueryOptions<TableSchema>
  ): DataLoader<TBatchKey, TableSchema[] | TableSchema | undefined> {
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
      columnTypes || keys.map((key) => this.metadata[key].nativeType)

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
      TableSchema[] | (TableSchema | undefined),
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
          const callback = (row: TableSchema) => {
            return Object.entries(batchKey).every(([key, value]) =>
              match(
                value as string | number,
                row[key as keyof TableSchema],
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
      TableSchema[] | (TableSchema | undefined)
    >
    loader.isMultiLoader = multi
    loader.columns = [...keys]
    this.loaders.push(loader)
    return loader
  }
}
