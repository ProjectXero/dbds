import DataLoader from 'dataloader'

import { FinderOptions } from './types'

export interface FinderFunction<TInput, TRowType> {
  (value: TInput): Promise<TRowType>
}

export default class FinderFactory<TRowType> {
  public create<TInput>(
    loader: DataLoader<TInput, TRowType[]>,
    options: FinderOptions & { multi: true }
  ): FinderFunction<TInput, TRowType[]>
  public create<TInput>(
    loader: DataLoader<TInput, TRowType | undefined>,
    options?: FinderOptions & { multi?: false }
  ): FinderFunction<TInput, TRowType | null>
  public create<TInput>(
    loader: DataLoader<TInput, TRowType | TRowType[] | undefined>,
    options?: FinderOptions
  ): FinderFunction<TInput, TRowType[] | TRowType | null> {
    const { multi = false } = options || {}

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
