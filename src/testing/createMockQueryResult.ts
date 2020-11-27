import { FieldType, QueryResultRowType, QueryResultType } from "slonik/dist/types"

export const createMockQueryResult = (
  rows: ReadonlyArray<QueryResultRowType>
): QueryResultType<QueryResultRowType> => {
  let fields: FieldType[] = []
  if (rows.length > 0) {
    fields = Object.keys(rows[0]).map<FieldType>((name, index) => ({
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
