import { createMockPool as slonikCreateMockPool } from 'slonik'
import {
  ClientConfigurationInputType,
  DatabasePoolType,
  QueryResultType,
} from 'slonik'
import { PrimitiveValueExpressionType } from 'slonik/dist/src/types'
import { createMockQueryResult } from './createMockQueryResult'

export interface MockedDatabasePoolType extends DatabasePoolType {
  mock: (
    sql: string,
    rows: readonly Record<string, PrimitiveValueExpressionType>[]
  ) => void
  resetMocks: () => void
}

export const createMockPool = (
  config?: ClientConfigurationInputType
): MockedDatabasePoolType => {
  const mockedQueries: Record<
    string,
    Array<QueryResultType<Record<string, PrimitiveValueExpressionType>>>
  > = {}

  const pool = slonikCreateMockPool(
    {
      query: async (sql, values) => {
        if (!mockedQueries[sql]) {
          console.warn(`
          ===================================
          No mocked result found for query
          SQL: \`${sql}\`
          Values: ${values}
          ===================================
          `)
          return createMockQueryResult([])
        }

        const result = mockedQueries[sql].shift()
        if (!result) {
          console.warn(`
          ===================================
          Ran out of mocked results for query
          SQL: \`${sql}\`
          Values: ${values}
          ===================================
          `)
          return createMockQueryResult([])
        }

        return result
      },
    },
    config
  )

  return Object.assign(pool, {
    mock: (
      sql: string,
      rows: readonly Record<string, PrimitiveValueExpressionType>[]
    ) => {
      if (!mockedQueries[sql]) {
        mockedQueries[sql] = []
      }
      mockedQueries[sql].push(createMockQueryResult(rows))
    },
    resetMocks: () => {
      Object.keys(mockedQueries).forEach((key) => {
        delete mockedQueries[key]
      })
    },
  })
}
