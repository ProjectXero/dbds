import { sql } from 'slonik'
import { z } from 'zod'

import { QueryBuilder } from '../queries'

const DEFAULT = Symbol('DEFAULT')

const DummyRowType = z.object({
  id: z.number(),
  name: z.string().or(z.literal(DEFAULT)),
  optional: z.string().optional(),
  nullable: z.string().nullish(),
  optionallyNullable: z.string().nullish(),
  stringOrNumber: z.string().or(z.number()).nullish(),
  date: z.date().nullish(),
})

const DummyMetadata = {
  id: {
    nativeType: 'these',
    nativeName: 'id',
  },
  name: {
    nativeType: 'types',
    nativeName: 'name',
  },
  optional: {
    nativeType: 'do',
    nativeName: 'optional',
  },
  nullable: {
    nativeType: 'not',
    nativeName: 'nullable',
  },
  optionallyNullable: {
    nativeType: 'matter',
    nativeName: 'optionally_nullable',
  },
  stringOrNumber: {
    nativeType: 'here',
    nativeName: 'string_or_number',
  },
  date: {
    nativeType: 'date',
    nativeName: 'date',
  },
}

describe(QueryBuilder, () => {
  const builder = new QueryBuilder(
    {
      name: 'any_table',
      metadata: DummyMetadata,
      schemas: {
        select: DummyRowType,
        insert: DummyRowType,
        update: DummyRowType.partial(),
      },
    },
    {},
    DEFAULT
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
        expect(builder.where(sql.fragment`true`)).toMatchSnapshot()
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.where([
            sql.fragment`true`,
            sql.fragment`false`,
            sql.fragment`more raw expressions etc.`,
          ])
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
        expect(builder.where({ id: sql.fragment`> 1` })).toMatchSnapshot()
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
        expect(
          builder.orderBy(sql.fragment`anything i want!`)
        ).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.orderBy([
            'a',
            sql.identifier(['b']),
            sql.fragment`c`,
            'd',
            sql.identifier(['e']),
            sql.fragment`f`,
          ])
        ).toMatchSnapshot()
      })

      it('can use order tuples', () => {
        expect(
          builder.orderBy([['a', 'DESC'], 'b', [sql.fragment`c`, 'ASC']])
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
        expect(
          builder.groupBy(sql.fragment`anything i want!`)
        ).toMatchSnapshot()
      })

      it('accepts a mix of different types', () => {
        expect(
          builder.groupBy([
            'a',
            sql.identifier(['b']),
            sql.fragment`c`,
            'd',
            sql.identifier(['e']),
            sql.fragment`f`,
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
        expect(builder.having(sql.fragment`true`)).toMatchSnapshot()
      })

      it('accepts a list of expressions', () => {
        expect(
          builder.having([
            sql.fragment`true`,
            sql.fragment`false`,
            sql.fragment`more raw expressions etc.`,
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
        expect(builder.limit(sql.fragment`anything, thanks`)).toMatchSnapshot()
      })
    })
  })

  describe('core query builders', () => {
    describe('select', () => {
      it('selects everything by default', () => {
        expect(builder.select()).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('supports limits', () => {
        expect(
          builder.select({
            limit: 10,
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('can select for update', () => {
        expect(
          builder.select({
            forUpdate: true,
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('can select for update of another table', () => {
        expect(
          builder.select({
            forUpdate: 'another_table',
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('can select for update of multiple other tables', () => {
        expect(
          builder.select({
            forUpdate: ['table', 'another_table', 'more_tables'],
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })
    })

    describe('count', () => {
      it('creates a count query', () => {
        expect(builder.count()).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('can use where clauses', () => {
        expect(builder.count({ where: { id: 1 } })).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })
    })

    describe('countGroup', () => {
      it('creates a count query with a groupBy clause', () => {
        expect(builder.countGroup(['name'])).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('can use where clauses', () => {
        expect(
          builder.countGroup(['nullable', 'optional'], { where: { id: 1 } })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
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
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
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
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
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
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('allows a single object with raw SQL values', () => {
        expect(
          builder.insert({
            id: 1,
            name: DEFAULT,
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('allows multiple objects with raw SQL values', () => {
        expect(
          builder.insert([
            {
              id: 1,
              name: DEFAULT,
            },
            {
              id: 2,
              name: DEFAULT,
            },
          ])
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
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
              name: DEFAULT,
            },
          ])
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
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
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it.skip('accepts raw sql values', () => {
        expect(
          builder.update({
            /* name: sql.fragment`anything i want` */
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('correctly updates Date objects as ISO8601 strings', () => {
        expect(
          builder.update({ date: new Date('2020-11-30T00:00:00.000-0500') })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })
    })

    describe('delete', () => {
      it("doesn't let you delete everything without being explicit", () => {
        // @ts-expect-error testing bad caller
        expect(() => builder.delete()).toThrowErrorMatchingSnapshot()
      })

      it('can be forced to delete everything', () => {
        expect(builder.delete(true)).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('builds clauses correctly', () => {
        expect(
          builder.delete({
            where: { id: 1 },
            groupBy: 'id',
            orderBy: 'id',
            having: { id: 1 },
          })
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })
    })

    describe('multiColumnBatchGet', () => {
      it('builds the query correctly', () => {
        expect(
          builder.multiColumnBatchGet(
            [
              { id: 1, name: 'asdf' },
              { id: 2, name: 'blah' },
            ],
            ['id', 'name'],
            ['integer', 'text']
          )
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })

      it('respects casing for column names', () => {
        expect(
          builder.multiColumnBatchGet(
            [{ optionallyNullable: 'anything', stringOrNumber: 0 }],
            ['optionallyNullable', 'stringOrNumber'],
            ['any', 'thing']
          )
        ).toMatchSnapshot({
          parser: expect.anything(),
          type: expect.any(String),
        })
      })
    })
  })
})
