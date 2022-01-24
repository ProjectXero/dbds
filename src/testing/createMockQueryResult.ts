import { Field, QueryResultRow, QueryResult } from 'slonik'

export const createMockQueryResult = (
  rows: ReadonlyArray<QueryResultRow>
): QueryResult<QueryResultRow> => {
  let fields: Field[] = []
  if (rows.length > 0) {
    fields = Object.keys(rows[0]).map<Field>((name, index) => ({
      dataTypeId: index,
      name,
    }))
  }

  rows.forEach((row) => {
    if (Object.keys(row || {}).length !== fields.length) {
      throw new Error(
        'Invalid mock data: all rows must have same number of fields'
      )
    }
  })

  return {
    command: 'SELECT',
    fields,
    notices: [],
    rowCount: rows.length,
    rows,
  }
}
