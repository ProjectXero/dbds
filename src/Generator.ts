import { pascal } from 'case'
import { createPrinter, EnumDeclaration, factory, InterfaceDeclaration, NewLineKind, NodeFlags, Printer, Statement, SyntaxKind } from 'typescript'

import { EnumBuilder, InsertTypeBuilder, TableBuilder } from './builders'
import SchemaInfo from './database'
import TypeMapper from './TypeMapper'

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
  private types: TypeMapper

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
    this.types = new TypeMapper(pascal)

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
    const statements: Statement[] = []

    if (this.generate.enums) {
      statements.push(...await this.buildEnums())
    }

    statements.push(...await this.buildTables())
    const sourceFile = factory.createSourceFile(statements, factory.createToken(SyntaxKind.EndOfFileToken), NodeFlags.None)

    return this.printer.printFile(sourceFile)
  }

  private async buildEnums(): Promise<EnumDeclaration[]> {
    const enums = await this.schema.getEnums()

    return enums.map((enumInfo) => {
      const builder = new EnumBuilder(enumInfo, this.types)
      this.types.registerType(builder.name, builder.typeName.text)
      return builder.buildDeclaration()
    })
  }

  private async buildTables(): Promise<InterfaceDeclaration[]> {
    const tables = await this.schema.getTables()

    return tables.map((tableInfo) => {
      const tableTypes: InterfaceDeclaration[] = []


      if (this.generate.tables) {
        const tableBuilder = new TableBuilder(tableInfo, this.types)
        tableTypes.push(tableBuilder.buildDeclaration())
      }

      if (this.generate.insertTypes) {
        const insertBuilder = new InsertTypeBuilder(tableInfo, this.types)
        tableTypes.push(insertBuilder.buildDeclaration())
      }

      return tableTypes
    }).flat().filter((v): v is InterfaceDeclaration => !!v)
  }
}
