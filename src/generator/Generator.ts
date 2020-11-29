import { pascal } from 'case'
import { createPrinter, factory, NewLineKind, NodeFlags, Printer, Statement, SyntaxKind } from 'typescript'

import { EnumBuilder, InsertTypeBuilder, TableBuilder } from './builders'
import NodeBuilder from './builders/NodeBuilder'
import { CaseFunction } from './builders/TypeBuilder'
import TypeObjectBuilder from './builders/TypeObjectBuilder'
import { SchemaInfo, TypeRegistry } from './database'

export interface GeneratorOptions {
  schema: SchemaInfo
  genEnums?: boolean
  genInsertTypes?: boolean
  genTables?: boolean
  genTypeObjects?: boolean
}

export default class Generator {
  private printer: Printer
  private schema: SchemaInfo
  private types: TypeRegistry
  private convertCase: CaseFunction

  public readonly generate: {
    enums: boolean
    insertTypes: boolean
    tables: boolean
    typeObjects: boolean
  }

  constructor({
    schema,
    genEnums = true,
    genInsertTypes = true,
    genTables = true,
    genTypeObjects = true,
  }: GeneratorOptions) {
    this.printer = createPrinter({
      newLine: NewLineKind.LineFeed,
      removeComments: false,
    })

    this.schema = schema
    this.types = new TypeRegistry()

    this.convertCase = pascal

    this.generate = Object.freeze({
      enums: genEnums,
      insertTypes: genInsertTypes,
      tables: genTables,
      typeObjects: genTypeObjects,
    })
  }

  public async destroy() {
    await this.schema.disconnect()
  }

  public async build(): Promise<string> {
    const statementBuilders: NodeBuilder<Statement>[] = []

    try {
      await this.buildEnums(statementBuilders)
      await this.buildTables(statementBuilders)
    } catch (error) {
      console.error(error?.message)
      process.exit(1)
    }

    const statements = statementBuilders.map<Statement>((builder) => builder.buildNode())

    const sourceFile = factory.createSourceFile(statements, factory.createToken(SyntaxKind.EndOfFileToken), NodeFlags.None)

    return this.printer.printFile(sourceFile)
  }

  private async buildEnums(builders: NodeBuilder<Statement>[]): Promise<void> {
    const enums = await this.schema.getEnums()

    enums.forEach((enumInfo) => {
      if (this.generate.enums) {
        const builder = new EnumBuilder(enumInfo, this.types, this.convertCase)
        this.types.add(builder.name, builder.typename().text)
        builders.push(builder)
      }
    })
  }

  private async buildTables(builders: NodeBuilder<Statement>[]): Promise<void> {
    const tables = await this.schema.getTables()

    tables.forEach((tableInfo) => {
      if (this.generate.tables) {
        const builder = new TableBuilder(tableInfo, this.types, this.convertCase)
        this.types.add(builder.name, builder.typename().text)
        builders.push(builder)
      }

      if (this.generate.insertTypes) {
        const builder = new InsertTypeBuilder(tableInfo, this.types, this.convertCase)
        builders.push(builder)
      }

      if (this.generate.typeObjects) {
        const builder = new TypeObjectBuilder(tableInfo, this.types, this.convertCase)
        builders.push(builder)
      }
    })
  }
}
