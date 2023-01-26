import {
  createPrinter,
  factory,
  NewLineKind,
  NodeFlags,
  Printer,
  Statement,
  SyntaxKind,
  addSyntheticLeadingComment,
} from 'typescript'
import * as Case from 'case'

import {
  EnumBuilder,
  InsertSchemaBuilder,
  InsertTypeBuilder,
  SelectSchemaBuilder,
  TableBuilder,
  TableMetadataBuilder,
} from './builders'
import { Buildable, isMultiBuildable } from './builders/NodeBuilder'
import TypeObjectBuilder from './builders/TypeObjectBuilder'
import { SchemaInfo, TypeRegistry } from './database'
import { CaseFunction, Transformations } from './types'
import UtilityTypesBuilder from './builders/UtilityTypesBuilder'
import ZodSchemaBuilder from './builders/ZodSchemaBuilder'
import SingleNamedImportBuilder from './builders/SingleNamedImportBuilder'
import UpdateSchemaBuilder from './builders/UpdateSchemaBuilder'

export interface GeneratorOptions {
  schema: SchemaInfo
  genSelectSchemas?: boolean
  genInsertSchemas?: boolean
  genUpdateSchemas?: boolean
  genTableMetadata?: boolean
  disableEslint?: boolean
  /** @deprecated */
  genEnums?: boolean
  /** @deprecated */
  genInsertTypes?: boolean
  /** @deprecated */
  genTables?: boolean
  /** @deprecated */
  genTypeObjects?: boolean
  /** @deprecated */
  genSchemaObjects?: boolean
  transformColumns?: Transformations.Column
  transformEnumMembers?: Transformations.EnumMember
  transformTypeNames?: Transformations.TypeName
}

const noop: CaseFunction = (value: string): string => value

export default class Generator {
  private printer: Printer
  private schema: SchemaInfo
  private types: TypeRegistry

  public readonly generate: {
    selectSchemas: boolean
    insertSchemas: boolean
    updateSchemas: boolean
    tableMetadata: boolean
    disableEslint: boolean
    /** @deprecated */
    enums: boolean
    /** @deprecated */
    insertTypes: boolean
    /** @deprecated */
    tables: boolean
    /** @deprecated */
    typeObjects: boolean
    /** @deprecated */
    schemaObjects: boolean
  }

  public readonly transform: Transformations

  constructor({
    schema,
    genSelectSchemas: selectSchemas = true,
    genInsertSchemas: insertSchemas = true,
    genUpdateSchemas: updateSchemas = true,
    genTableMetadata: tableMetadata = true,
    disableEslint = true,
    genEnums = false,
    genInsertTypes = false,
    genTables = false,
    genTypeObjects = false,
    genSchemaObjects = false,
    transformColumns = 'none',
    transformEnumMembers = 'pascal',
    transformTypeNames = 'pascal',
  }: GeneratorOptions) {
    this.printer = createPrinter({
      newLine: NewLineKind.LineFeed,
      removeComments: false,
    })

    this.schema = schema
    this.types = new TypeRegistry()

    this.generate = Object.freeze({
      selectSchemas,
      insertSchemas,
      updateSchemas,
      tableMetadata,
      disableEslint,
      enums: genEnums,
      insertTypes: genInsertTypes,
      tables: genTables,
      typeObjects: genTypeObjects,
      schemaObjects: genSchemaObjects,
    })

    this.transform = Object.freeze({
      columns: transformColumns === 'none' ? noop : Case[transformColumns],
      enumMembers:
        transformEnumMembers === 'none' ? noop : Case[transformEnumMembers],
      typeNames: Case[transformTypeNames],
    })
  }

  public async destroy(): Promise<void> {
    await this.schema.disconnect()
  }

  public async build(): Promise<string> {
    const statementBuilders: Buildable<Statement>[] = []

    try {
      statementBuilders.push(...(await this.enumBuilders()))
      statementBuilders.push(...(await this.tableBuilders()))
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      }
      throw error
    }

    statementBuilders.unshift(new UtilityTypesBuilder())
    statementBuilders.unshift(...(await this.importBuilders()))

    const statements = statementBuilders.flatMap<Statement>((builder) =>
      isMultiBuildable(builder) ? builder.buildNodes() : builder.buildNode()
    )

    if (this.generate.disableEslint) {
      this.disableEslint(statements)
    }

    const sourceFile = factory.createSourceFile(
      statements,
      factory.createToken(SyntaxKind.EndOfFileToken),
      NodeFlags.None
    )

    return this.printer.printFile(sourceFile)
  }

  private async importBuilders(): Promise<Buildable<Statement>[]> {
    const builders: Buildable<Statement>[] = []
    if (
      this.generate.selectSchemas ||
      this.generate.insertSchemas ||
      this.generate.schemaObjects
    ) {
      builders.unshift(
        new SingleNamedImportBuilder(
          { name: 'z', source: 'zod' },
          this.types,
          this.transform
        )
      )
    }
    return builders
  }

  private async enumBuilders(): Promise<Buildable<Statement>[]> {
    const enums = await this.schema.getEnums()

    const builders: Buildable<Statement>[] = []

    enums.forEach((enumInfo) => {
      if (this.generate.enums) {
        const builder = new EnumBuilder(enumInfo, this.types, this.transform)
        this.types.add(builder.name, builder.typename().text, 'enum')
        builders.push(builder)
      }
    })

    return builders
  }

  private async tableBuilders(): Promise<Buildable<Statement>[]> {
    const tables = await this.schema.getTables()

    const builders: Buildable<Statement>[] = []

    const processedTableNames: string[] = []

    tables.forEach((tableInfo) => {
      if (processedTableNames.includes(tableInfo.name)) {
        console.warn(
          `Duplicate table name detected: ${tableInfo.name}. ` +
            `This is not supported, skipping.`
        )
        return
      }

      if (this.generate.tableMetadata) {
        const builder = new TableMetadataBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        processedTableNames.push(tableInfo.name)
        builders.push(builder)
      }

      if (this.generate.selectSchemas) {
        const builder = new SelectSchemaBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
      }

      if (this.generate.insertSchemas) {
        const builder = new InsertSchemaBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
      }

      if (this.generate.updateSchemas) {
        const builder = new UpdateSchemaBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
      }

      if (this.generate.tables) {
        const builder = new TableBuilder(tableInfo, this.types, this.transform)
        this.types.add(builder.name, builder.typename().text, 'table')
        builders.push(builder)
      }

      if (this.generate.insertTypes) {
        const builder = new InsertTypeBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
      }

      if (this.generate.typeObjects) {
        const builder = new TypeObjectBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
      }

      /* since it's generating constants, we need to make SURE that we only
      generate these once per */
      if (
        this.generate.schemaObjects &&
        !processedTableNames.includes(tableInfo.name)
      ) {
        const builder = new ZodSchemaBuilder(
          tableInfo,
          this.types,
          this.transform
        )
        builders.push(builder)
        processedTableNames.push(tableInfo.name)
      }
    })

    return builders
  }

  private async disableEslint(statements: Statement[]): Promise<void> {
    if (!statements.length) {
      return
    }

    const first_statement = statements.shift()
    if (!first_statement) {
      return
    }

    statements.unshift(
      addSyntheticLeadingComment(
        first_statement,
        SyntaxKind.MultiLineCommentTrivia,
        ' eslint-disable ',
        true
      )
    )
  }
}
