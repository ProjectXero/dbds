import { sql } from 'slonik'
import { QueryBuilder } from '../queries'

interface DummyRowType {
  id: number
  name: string
  optional?: string
  nullable: string | null
  optionallyNullable?: string | null
  // i think this is a nonsense type but i needed to test the type system...
  stringOrNumber: string | number | null
  date?: Date
}

const DummyRowColumnTypes = Object.freeze({
  id: 'these',
  name: 'types',
  optional: 'do',
  nullable: 'not',
  optionallyNullable: 'matter',
  stringOrNumber: 'here',
  date: 'date',
})

describe(QueryBuilder, () => {
  const builder = new QueryBuilder<DummyRowType>(
    'any_table',
    DummyRowColumnTypes,
    (v) => v,
    {}
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

      it('enables custom operators through use of sql tokens', () => {
        expect(builder.where({ id: sql`> 1` })).toMatchSnapshot()
      })

      it('produces a valid clause with no conditions', () => {
        expect(builder.where({})).toMatchSnapshot()
        expect(builder.where([])).toMatchSnapshot()
      })

      it('correctly handles Date objects', () => {
        expect(
          builder.where({ date: new Date('2020-11-30T00:00:00.000-0500') })
        ).toMatchSnapshot()
      })

      it('handles null lookups correctly', () => {
        expect(builder.where({ nullable: null })).toMatchSnapshot()
      })
    })

    describe('orderBy', () => {
      it('accepts a single column name as a string', () => {
        expect(builder.orderBy('a')).toMatchSnapshot()
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.orderBy(['a', 'b', 'c'])).toMatchSnapshot()
      })

      it('accepts a single column name as an identifier', () => {
        expect(builder.orderBy(sql.identifier(['column']))).toMatchSnapshot()
      })

      it('accepts a single column name as arbitrary sql', () => {
        expect(builder.orderBy(sql`anything i want!`)).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.orderBy([
            'a',
            sql.identifier(['b']),
            sql`c`,
            'd',
            sql.identifier(['e']),
            sql`f`,
          ])
        ).toMatchSnapshot()
      })

      it('can use order tuples', () => {
        expect(
          builder.orderBy([['a', 'DESC'], 'b', [sql`c`, 'ASC']])
        ).toMatchSnapshot()
      })
    })

    describe('groupBy', () => {
      it('accepts a single column name as a string', () => {
        expect(builder.groupBy('a')).toMatchSnapshot()
      })

      it('accepts a list of column names as an array of strings', () => {
        expect(builder.groupBy(['a', 'b', 'c'])).toMatchSnapshot()
      })

      it('accepts a single column name as an identifier', () => {
        expect(builder.groupBy(sql.identifier(['column']))).toMatchSnapshot()
      })

      it('accepts a single column name as arbitrary sql', () => {
        expect(builder.groupBy(sql`anything i want!`)).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.groupBy([
            'a',
            sql.identifier(['b']),
            sql`c`,
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

    describe('limit', () => {
      it('can create a LIMIT <number> clause', () => {
        expect(builder.limit(1)).toMatchSnapshot()
      })

      it('can create a LIMIT ALL clause', () => {
        expect(builder.limit('ALL')).toMatchSnapshot()
      })

      it('can create an offset clause with limit', () => {
        expect(builder.limit([1, 1])).toMatchSnapshot()
        expect(builder.limit(['ALL', 1])).toMatchSnapshot()
      })

      it('can accept arbitrary sql', () => {
        expect(builder.limit(sql`anything, thanks`)).toMatchSnapshot()
      })
    })
  })

  describe('core query builders', () => {
    describe('select', () => {
      it('selects everything by default', () => {
        expect(builder.select()).toMatchSnapshot()
      })

      it('supports limits', () => {
        expect(
          builder.select({
            limit: 10,
          })
        ).toMatchSnapshot()
      })

      it('can select for update', () => {
        expect(
          builder.select({
            forUpdate: true,
          })
        ).toMatchSnapshot()
      })

      it('can select for update of another table', () => {
        expect(
          builder.select({
            forUpdate: 'another_table',
          })
        ).toMatchSnapshot()
      })

      it('can select for update of multiple other tables', () => {
        expect(
          builder.select({
            forUpdate: ['table', 'another_table', 'more_tables'],
          })
        ).toMatchSnapshot()
      })
    })

    describe('count', () => {
      it('creates a count query', () => {
        expect(builder.count()).toMatchSnapshot()
      })

      it('can use where clauses', () => {
        expect(builder.count({ where: { id: 1 } })).toMatchSnapshot()
      })
    })

    describe('countGroup', () => {
      it('creates a count query with a groupBy clause', () => {
        expect(builder.countGroup(['name'])).toMatchSnapshot()
      })

      it('can use where clauses', () => {
        expect(
          builder.countGroup(['nullable', 'optional'], { where: { id: 1 } })
        ).toMatchSnapshot()
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

      it('correctly inserts Date objects as ISO8601 strings', () => {
        expect(
          builder.insert({
            id: 1,
            name: 'name',
            nullable: null,
            stringOrNumber: 1,
            date: new Date('2020-11-30T00:00:00.000-0500'),
          })
        ).toMatchSnapshot()
      })

      it('allows a single object with raw SQL values', () => {
        expect(
          builder.insert({
            id: 1,
            name: sql`DEFAULT`,
          })
        ).toMatchSnapshot()
      })

      it('allows multiple objects with raw SQL values', () => {
        expect(
          builder.insert([
            {
              id: 1,
              name: sql`DEFAULT`,
            },
            {
              id: 2,
              name: sql`DEFAULT`,
            },
          ])
        ).toMatchSnapshot()
      })

      it('allows multiple objects with a mix of value types', () => {
        expect(
          builder.insert([
            {
              id: 1,
              name: 'anything',
            },
            {
              id: 2,
              name: sql`DEFAULT`,
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

      it('correctly updates Date objects as ISO8601 strings', () => {
        expect(
          builder.update({ date: new Date('2020-11-30T00:00:00.000-0500') })
        ).toMatchSnapshot()
      })
    })

    describe('delete', () => {
      it("doesn't let you delete everything without being explicit", () => {
        // @ts-expect-error testing bad caller
        expect(() => builder.delete()).toThrowErrorMatchingSnapshot()
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
