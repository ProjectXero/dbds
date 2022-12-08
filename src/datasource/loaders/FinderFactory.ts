import DataLoader from 'dataloader'

import { FinderOptions, ExtendedDataLoader } from './types'

export interface FinderFunction<Input, Result> {
  (value: Input): Promise<Result>
}

export const isExtendedDataLoader = <M extends boolean, K, V, C>(
  loader: unknown
): loader is ExtendedDataLoader<M, K, V, C> => {
  return (
    typeof loader === 'object' &&
    typeof (loader as ExtendedDataLoader<M, K, V, C>).isMultiLoader ===
      'boolean'
  )
}

export default class FinderFactory<Schema> {
  public create<TInput>(
    loader: ExtendedDataLoader<true, TInput, Schema[]>,
    options?: FinderOptions
  ): FinderFunction<TInput, Schema[]>
  public create<TInput>(
    loader: ExtendedDataLoader<false, TInput, Schema | undefined>,
    options?: FinderOptions & { multi?: false }
  ): FinderFunction<TInput, Schema | null>
  public create<TInput>(
    loader: DataLoader<TInput, Schema[]>,
    options: FinderOptions & { multi: true }
  ): FinderFunction<TInput, Schema[]>
  public create<TInput>(
    loader: DataLoader<TInput, Schema | undefined>,
    options?: FinderOptions & { multi?: false }
  ): FinderFunction<TInput, Schema | null>
  public create<TInput>(
    loader:
      | ExtendedDataLoader<boolean, TInput, Schema | Schema[] | undefined>
      | DataLoader<TInput, Schema | Schema[] | undefined>,
    options: FinderOptions = {}
  ): FinderFunction<TInput, Schema[] | Schema | null> {
    if (isExtendedDataLoader(loader)) {
      options.multi = loader.isMultiLoader
    }

    const { multi = false } = options

    if (multi === true) {
      return async (value: TInput): Promise<Schema[]> => {
        const result = await loader.load(value)
        if (!result) {
          return []
        }
        if (Array.isArray(result)) {
          return result
        }
        return [result]
      }
    }

    return async (value: TInput): Promise<Schema | null> => {
      const result = await loader.load(value)
      if (!result) {
        return null
      }
      if (Array.isArray(result)) {
        return result[0]
      }
      return result
    }
  }
}
