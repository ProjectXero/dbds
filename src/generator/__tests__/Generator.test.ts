import { createMockPool } from '../../testing'

import { SchemaInfo } from '../database'
import { Generator } from '..'

import mockEnums from './__fixtures__/enums'
import mockTables from './__fixtures__/tables'

describe(Generator, () => {
  const dummySchema = new SchemaInfo(createMockPool(), 'any')
  const tableSpy = jest.spyOn(dummySchema, 'getTables')
  const enumSpy = jest.spyOn(dummySchema, 'getEnums')

  const warnSpy = jest.spyOn(console, 'warn')
  warnSpy.mockImplementation(() => {
    /* do nothing */
  })

  const errorSpy = jest.spyOn(console, 'error')
  errorSpy.mockImplementation(() => {
    /* do nothing */
  })

  beforeEach(() => {
    warnSpy.mockClear()
    tableSpy.mockImplementation(async () => mockTables)
    enumSpy.mockImplementation(async () => mockEnums)
  })

  describe('with default options', () => {
    const instance = new Generator({
      schema: dummySchema,
    })

    it('generates metadata and select/insert schemas', async () => {
      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('with everything disabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: false,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: false,
      genSchemaObjects: false,
    })

    it('generates nothing', async () => {
      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('with tables enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: false,
      genInsertTypes: false,
      genTables: true,
      genTypeObjects: false,
      genSchemaObjects: false,
    })

    it('generates tables', async () => {
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with enums enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: true,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: false,
      genSchemaObjects: false,
    })

    it('generates enums', async () => {
      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('with insert types enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: false,
      genInsertTypes: true,
      genTables: false,
      genTypeObjects: false,
      genSchemaObjects: false,
    })

    it('generates insert types', async () => {
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with type objects enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: false,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: true,
      genSchemaObjects: false,
    })

    it('generates type objects', async () => {
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with schema objects enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genTableMetadata: false,
      genSelectSchemas: false,
      genInsertSchemas: false,
      genUpdateSchemas: false,
      genEnums: false,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: false,
      genSchemaObjects: true,
    })

    it('generates schema objects', async () => {
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with different case conversions', () => {
    const instance = new Generator({
      schema: dummySchema,
      transformColumns: 'camel',
      transformEnumMembers: 'none',
    })

    it('properly cases members', async () => {
      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('when re-registering an already-registered type', () => {
    beforeEach(() => {
      tableSpy.mockImplementation(async () => [
        {
          name: 'somehow_duplicated_type_name',
          canInsert: true,
          columns: [],
        },
        {
          name: 'somehow_duplicated_type_name',
          canInsert: true,
          columns: [],
        },
      ])
    })

    const instance = new Generator({
      schema: dummySchema,
      genEnums: false,
      genTables: true,
      genInsertTypes: false,
      genTypeObjects: false,
    })

    it('outputs a warning', async () => {
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('build', () => {
    const instance = new Generator({
      schema: dummySchema,
    })
    const tableBuildersSpy = jest.spyOn(instance, 'tableBuilders' as never)

    beforeEach(() => {
      tableBuildersSpy.mockImplementation(() => {
        throw new Error('testing error handling')
      })
    })

    afterEach(() => {
      tableBuildersSpy.mockReset()
    })

    describe('when builders throw an error', () => {
      it('logs the error and rethrows', async () => {
        await expect(instance.build()).rejects.toThrowError(
          'testing error handling'
        )
        expect(errorSpy.mock.calls).toMatchSnapshot()
      })
    })
  })
})
