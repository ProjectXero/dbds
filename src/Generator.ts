import { pascal } from 'case'
import { createPrinter, factory, NewLineKind, NodeFlags, Printer, Statement, SyntaxKind } from 'typescript'

import { EnumBuilder, InsertTypeBuilder, TableBuilder } from './builders'
import NodeBuilder from './builders/NodeBuilder'
import { CaseFunction } from './builders/TypeBuilder'
import { SchemaInfo, TypeRegistry } from './database'

export interface GeneratorOptions {
  dbUrl: string
  schema: string
  newline?: 'lf' | 'crlf'
  genEnums?: boolean
  genInsertTypes?: boolean
  genTables?: boolean
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
  }

  constructor({
    newline = 'lf',
    genEnums = true,
    genInsertTypes = true,
    genTables = true,
    ...options
  }: GeneratorOptions) {
    if (newline !== 'lf' && newline !== 'crlf') {
      console.warn(`Unknown newline type '${newline}' received. Acceptable values: lf, crlf. Defaulting to 'lf'.`)
    }

    this.printer = createPrinter({
      newLine: newline === 'crlf' ? NewLineKind.CarriageReturnLineFeed : NewLineKind.LineFeed,
      removeComments: false,
    })

    this.schema = new SchemaInfo(options.dbUrl, options.schema)
    this.types = new TypeRegistry()

    this.convertCase = pascal

    this.generate = Object.freeze({
      enums: genEnums,
      insertTypes: genInsertTypes,
      tables: genTables,
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
    })
  }
}
