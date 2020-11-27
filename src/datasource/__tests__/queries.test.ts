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
  const builder = new QueryBuilder<DummyRowType>('any_table', DummyRowColumnTypes)

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
})
