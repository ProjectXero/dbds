import { sql } from 'slonik'
import { QueryBuilder } from '../queries'

interface DummyRowType {
  id: number
  name: string
}

const DummyRowColumnTypes = Object.freeze({
  id: 'integer',
  name: 'text',
})

describe(QueryBuilder, () => {
  const builder = new QueryBuilder<DummyRowType>(
    'any_table',
    DummyRowColumnTypes
  )

  describe('clause generators', () => {
    describe('where', () => {
      it('accepts a simple object', () => {
        expect(builder.where({ id: 1 })).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE (\\"any_table\\".\\"id\\" = $1)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
            ],
          }
        `)
      })

      it('uses AND for multiple columns in a simple object', () => {
        expect(builder.where({ id: 1, name: 'Bob' })).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE (\\"any_table\\".\\"id\\" = $1 AND \\"any_table\\".\\"name\\" = $2)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
              "Bob",
            ],
          }
        `)
      })

      it('handles multiple values for a column', () => {
        expect(builder.where({ id: [1, 2, 3] })).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE (\\"any_table\\".\\"id\\" = ANY($1::integer[]))",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              Array [
                1,
                2,
                3,
              ],
            ],
          }
        `)
      })

      it('lets you pass in a raw expression', () => {
        expect(builder.where(sql`true`)).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.where([sql`true`, sql`false`, sql`more raw expressions etc.`])
        ).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE (true AND false AND more raw expressions etc.)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('sanely handles output from the `and` and `or` utilities', () => {
        const conditions = builder.or([
          builder.and({ id: 1, name: 'asdf' }),
          builder.and({ id: 2, name: 'wow' }),
        ])

        expect(builder.where(conditions)).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE ((\\"any_table\\".\\"id\\" = $1 AND \\"any_table\\".\\"name\\" = $2) OR (\\"any_table\\".\\"id\\" = $3 AND \\"any_table\\".\\"name\\" = $4))",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
              "asdf",
              2,
              "wow",
            ],
          }
        `)
      })

      it('produces a valid clause with no conditions', () => {
        expect(builder.where({})).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
        expect(builder.where([])).toMatchInlineSnapshot(`
          Object {
            "sql": "WHERE true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })
    })

    describe('orderBy', () => {
      it('accepts a list of column names as strings', () => {
        expect(builder.orderBy('a', 'b', 'c')).toMatchInlineSnapshot(`
          Object {
            "sql": "ORDER BY \\"any_table\\".\\"a\\", \\"any_table\\".\\"b\\", \\"any_table\\".\\"c\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.orderBy(['a', 'b', 'c'])).toMatchInlineSnapshot(`
          Object {
            "sql": "ORDER BY \\"any_table\\".\\"a\\", \\"any_table\\".\\"b\\", \\"any_table\\".\\"c\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts identifier tokens', () => {
        expect(builder.orderBy(sql.identifier(['column'])))
          .toMatchInlineSnapshot(`
          Object {
            "sql": "ORDER BY \\"column\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts arbitrary sql tokens', () => {
        expect(builder.orderBy(sql`anything i want!`)).toMatchInlineSnapshot(`
          Object {
            "sql": "ORDER BY anything i want!",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.orderBy('a', sql.identifier(['b']), sql`c`, [
            'd',
            sql.identifier(['e']),
            sql`f`,
          ])
        ).toMatchInlineSnapshot(`
          Object {
            "sql": "ORDER BY \\"any_table\\".\\"a\\", \\"b\\", c, \\"any_table\\".\\"d\\", \\"e\\", f",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })
    })

    describe('groupBy', () => {
      it('accepts a list of column names as strings', () => {
        expect(builder.groupBy('a', 'b', 'c')).toMatchInlineSnapshot(`
          Object {
            "sql": "GROUP BY \\"any_table\\".\\"a\\", \\"any_table\\".\\"b\\", \\"any_table\\".\\"c\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.groupBy(['a', 'b', 'c'])).toMatchInlineSnapshot(`
          Object {
            "sql": "GROUP BY \\"any_table\\".\\"a\\", \\"any_table\\".\\"b\\", \\"any_table\\".\\"c\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts identifier tokens', () => {
        expect(builder.groupBy(sql.identifier(['column'])))
          .toMatchInlineSnapshot(`
          Object {
            "sql": "GROUP BY \\"column\\"",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts arbitrary sql tokens', () => {
        expect(builder.groupBy(sql`anything i want!`)).toMatchInlineSnapshot(`
          Object {
            "sql": "GROUP BY anything i want!",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.groupBy('a', sql.identifier(['b']), sql`c`, [
            'd',
            sql.identifier(['e']),
            sql`f`,
          ])
        ).toMatchInlineSnapshot(`
          Object {
            "sql": "GROUP BY \\"any_table\\".\\"a\\", \\"b\\", c, \\"any_table\\".\\"d\\", \\"e\\", f",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })
    })

    describe('having', () => {
      it('accepts a simple object', () => {
        expect(builder.having({ id: 1 })).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING (\\"any_table\\".\\"id\\" = $1)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
            ],
          }
        `)
      })

      it('uses AND for multiple columns in a simple object', () => {
        expect(builder.having({ id: 1, name: 'Bob' })).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING (\\"any_table\\".\\"id\\" = $1 AND \\"any_table\\".\\"name\\" = $2)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
              "Bob",
            ],
          }
        `)
      })

      it('handles multiple values for a column', () => {
        expect(builder.having({ id: [1, 2, 3] })).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING (\\"any_table\\".\\"id\\" = ANY($1::integer[]))",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              Array [
                1,
                2,
                3,
              ],
            ],
          }
        `)
      })

      it('lets you pass in a raw expression', () => {
        expect(builder.having(sql`true`)).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.having([
            sql`true`,
            sql`false`,
            sql`more raw expressions etc.`,
          ])
        ).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING (true AND false AND more raw expressions etc.)",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })

      it('sanely handles output from the `and` and `or` utilities', () => {
        const conditions = builder.or([
          builder.and({ id: 1, name: 'asdf' }),
          builder.and({ id: 2, name: 'wow' }),
        ])

        expect(builder.having(conditions)).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING ((\\"any_table\\".\\"id\\" = $1 AND \\"any_table\\".\\"name\\" = $2) OR (\\"any_table\\".\\"id\\" = $3 AND \\"any_table\\".\\"name\\" = $4))",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [
              1,
              "asdf",
              2,
              "wow",
            ],
          }
        `)
      })

      it('produces a valid clause with no conditions', () => {
        expect(builder.having({})).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
        expect(builder.having([])).toMatchInlineSnapshot(`
          Object {
            "sql": "HAVING true",
            "type": "SLONIK_TOKEN_SQL",
            "values": Array [],
          }
        `)
      })
    })
  })
})
