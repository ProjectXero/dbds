import DataLoader from 'dataloader'
import { ExtendedDataLoader } from './LoaderFactory'

import { FinderOptions } from './types'

export interface FinderFunction<TInput, TRowType> {
  (value: TInput): Promise<TRowType>
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

export default class FinderFactory<TRowType> {
  public create<TInput>(
    loader: ExtendedDataLoader<true, TInput, TRowType[]>,
    options?: FinderOptions
  ): FinderFunction<TInput, TRowType[]>
  public create<TInput>(
    loader: ExtendedDataLoader<false, TInput, TRowType | undefined>,
    options?: FinderOptions & { multi?: false }
  ): FinderFunction<TInput, TRowType | null>
  public create<TInput>(
    loader: DataLoader<TInput, TRowType[]>,
    options: FinderOptions & { multi: true }
  ): FinderFunction<TInput, TRowType[]>
  public create<TInput>(
    loader: DataLoader<TInput, TRowType | undefined>,
    options?: FinderOptions & { multi?: false }
  ): FinderFunction<TInput, TRowType | null>
  public create<TInput>(
    loader:
      | ExtendedDataLoader<boolean, TInput, TRowType | TRowType[] | undefined>
      | DataLoader<TInput, TRowType | TRowType[] | undefined>,
    options: FinderOptions = {}
  ): FinderFunction<TInput, TRowType[] | TRowType | null> {
    if (isExtendedDataLoader(loader)) {
      options.multi = loader.isMultiLoader
    }

    const { multi = false } = options

    if (multi === true) {
      return async (value: TInput): Promise<TRowType[]> => {
        const result = await loader.load(value)
        if (!result) {
          return []
        }
        if (!Array.isArray(result)) {
          return [result]
        }
        return result
      }
    }

    return async (value: TInput): Promise<TRowType | null> => {
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
