import { sql } from 'slonik'
import { QueryBuilder } from '../queries'

interface DummyRowType {
  id: number
  name: string
  optional?: string
  nullable: string | null
  optionallyNullable?: string | null
  stringOrNumber: string | number | null // i think this is a nonsense type but i needed to test the type system...
}

const DummyRowColumnTypes = Object.freeze({
  id: 'these',
  name: 'types',
  optional: 'do',
  nullable: 'not',
  optionallyNullable: 'matter',
  stringOrNumber: 'here',
})

describe(QueryBuilder, () => {
  const builder = new QueryBuilder<DummyRowType>(
    'any_table',
    DummyRowColumnTypes
  )

  describe('clause generators', () => {
    describe('where', () => {
      it('accepts a simple object', () => {
        expect(builder.where({ id: 1 })).toMatchSnapshot()
      })

      it('accepts complex conditions', () => {
        expect(
          builder.where({ id: 1, nullable: null, stringOrNumber: ['a', null] })
        ).toMatchSnapshot()
      })

      it('uses AND for multiple columns in a simple object', () => {
        expect(builder.where({ id: 1, name: 'Bob' })).toMatchSnapshot()
      })

      it('handles multiple values for a column', () => {
        expect(builder.where({ id: [1, 2, 3] })).toMatchSnapshot()
      })

      it('lets you pass in a raw expression', () => {
        expect(builder.where(sql`true`)).toMatchSnapshot()
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.where([sql`true`, sql`false`, sql`more raw expressions etc.`])
        ).toMatchSnapshot()
      })

      it('sanely handles output from the `and` and `or` utilities', () => {
        const conditions = builder.or([
          builder.and({ id: 1, name: 'asdf' }),
          builder.and({ id: 2, name: 'wow' }),
        ])

        expect(builder.where(conditions)).toMatchSnapshot()
      })

      it('produces a valid clause with no conditions', () => {
        expect(builder.where({})).toMatchSnapshot()
        expect(builder.where([])).toMatchSnapshot()
      })
    })

    describe('orderBy', () => {
      it('accepts a list of column names as strings', () => {
        expect(builder.orderBy('a', 'b', 'c')).toMatchSnapshot()
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.orderBy(['a', 'b', 'c'])).toMatchSnapshot()
      })

      it('accepts identifier tokens', () => {
        expect(builder.orderBy(sql.identifier(['column']))).toMatchSnapshot()
      })

      it('accepts arbitrary sql tokens', () => {
        expect(builder.orderBy(sql`anything i want!`)).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.orderBy('a', sql.identifier(['b']), sql`c`, [
            'd',
            sql.identifier(['e']),
            sql`f`,
          ])
        ).toMatchSnapshot()
      })
    })

    describe('groupBy', () => {
      it('accepts a list of column names as strings', () => {
        expect(builder.groupBy('a', 'b', 'c')).toMatchSnapshot()
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.groupBy(['a', 'b', 'c'])).toMatchSnapshot()
      })

      it('accepts identifier tokens', () => {
        expect(builder.groupBy(sql.identifier(['column']))).toMatchSnapshot()
      })

      it('accepts arbitrary sql tokens', () => {
        expect(builder.groupBy(sql`anything i want!`)).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.groupBy('a', sql.identifier(['b']), sql`c`, [
            'd',
            sql.identifier(['e']),
            sql`f`,
          ])
        ).toMatchSnapshot()
      })
    })

    describe('having', () => {
      it('accepts a simple object', () => {
        expect(builder.having({ id: 1 })).toMatchSnapshot()
      })

      it('uses AND for multiple columns in a simple object', () => {
        expect(builder.having({ id: 1, name: 'Bob' })).toMatchSnapshot()
      })

      it('handles multiple values for a column', () => {
        expect(builder.having({ id: [1, 2, 3] })).toMatchSnapshot()
      })

      it('lets you pass in a raw expression', () => {
        expect(builder.having(sql`true`)).toMatchSnapshot()
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.having([
            sql`true`,
            sql`false`,
            sql`more raw expressions etc.`,
          ])
        ).toMatchSnapshot()
      })

      it('sanely handles output from the `and` and `or` utilities', () => {
        const conditions = builder.or([
          builder.and({ id: 1, name: 'asdf' }),
          builder.and({ id: 2, name: 'wow' }),
        ])

        expect(builder.having(conditions)).toMatchSnapshot()
      })

      it('produces a valid clause with no conditions', () => {
        expect(builder.having({})).toMatchSnapshot()
        expect(builder.having([])).toMatchSnapshot()
      })
    })
  })

  describe('core query builders', () => {
    describe('select', () => {
      it('selects everything by default', () => {
        expect(builder.select()).toMatchSnapshot()
      })
    })

    describe('count', () => {
      it('creates a count query', () => {
        expect(builder.count()).toMatchSnapshot()
      })

      it('can use where clauses', () => {
        expect(builder.count({ where: { id: 1 } })).toMatchSnapshot()
      })

      it('does not support group by clauses for the moment', () => {
        expect(() =>
          builder.count({ groupBy: 'id' })
        ).toThrowErrorMatchingInlineSnapshot(
          `"count does not currently support GROUP BY clauses"`
        )
      })
    })

    describe('insert', () => {
      it('accepts a basic object', () => {
        expect(
          builder.insert({
            id: 1,
            name: 'name',
            nullable: null,
            stringOrNumber: 1,
          })
        ).toMatchSnapshot()
      })

      it('accepts many basic objects', () => {
        expect(
          builder.insert([
            {
              id: 1,
              name: 'name',
              nullable: null,
              stringOrNumber: 1,
            },
            {
              stringOrNumber: 'wat',
              id: 2,
              name: 'name',
              nullable: 'hi',
            },
          ])
        ).toMatchSnapshot()
      })
    })

    describe('update', () => {
      it('accepts a basic object', () => {
        expect(
          builder.update({
            id: 5,
            name: 'any',
            nullable: null,
            optional: 'asdf',
            optionallyNullable: null,
            stringOrNumber: 5,
          })
        ).toMatchSnapshot()
      })

      it('accepts raw sql values', () => {
        expect(builder.update({ name: sql`anything i want` })).toMatchSnapshot()
      })
    })

    describe('delete', () => {
      it("doesn't let you delete everything without explicitly okaying it", () => {
        // @ts-expect-error
        expect(() => builder.delete()).toThrowErrorMatchingInlineSnapshot(
          `"Implicit deletion of everything is not allowed. To delete everything, please pass \`true\` or include options."`
        )
      })

      it('can be forced to delete everything', () => {
        expect(builder.delete(true)).toMatchSnapshot()
      })

      it('builds clauses correctly', () => {
        expect(
          builder.delete({
            where: { id: 1 },
            groupBy: 'id',
            orderBy: 'id',
            having: { id: 1 },
          })
        ).toMatchSnapshot()
      })
    })
  })
})
