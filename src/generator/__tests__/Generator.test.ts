
import { createMockPool } from "../../testing"

import { SchemaInfo } from "../database"
import { Generator } from ".."

import mockEnums from "./__fixtures__/enums"
import mockTables from "./__fixtures__/tables"

describe(Generator, () => {
  const dummySchema = new SchemaInfo(createMockPool(), 'any')
  const tableSpy = jest.spyOn(dummySchema, 'getTables')
  const enumSpy = jest.spyOn(dummySchema, 'getEnums')

  beforeEach(() => {
    tableSpy.mockImplementation(async () => mockTables)
    enumSpy.mockImplementation(async () => mockEnums)
  })

  describe('with default options', () => {
    const instance = new Generator({
      schema: dummySchema
    })

    it('generates everything', async () => {

      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('with everything disabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genEnums: false,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: false,
    })

    it('generates nothing', async () => {
      expect(await instance.build()).toStrictEqual('')
    })
  })

  describe('with tables enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genEnums: false,
      genInsertTypes: false,
      genTables: true,
      genTypeObjects: false,
    })

    it('generates tables', async () => {
      const warnSpy = jest.spyOn(console, 'warn')
      warnSpy.mockImplementation(() => { })
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with enums enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genEnums: true,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: false,
    })

    it('generates enums', async () => {
      expect(await instance.build()).toMatchSnapshot()
    })
  })

  describe('with insert types enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genEnums: false,
      genInsertTypes: true,
      genTables: false,
      genTypeObjects: false,
    })

    it('generates insert types', async () => {
      const warnSpy = jest.spyOn(console, 'warn')
      warnSpy.mockImplementation(() => { })
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })

  describe('with type objects enabled', () => {
    const instance = new Generator({
      schema: dummySchema,
      genEnums: false,
      genInsertTypes: false,
      genTables: false,
      genTypeObjects: true,
    })

    it('generates type objects', async () => {
      const warnSpy = jest.spyOn(console, 'warn')
      warnSpy.mockImplementation(() => { })
      expect(await instance.build()).toMatchSnapshot()
      expect(warnSpy.mock.calls).toMatchSnapshot()
    })
  })
})
