import { createPrinter, EnumDeclaration, factory, InterfaceDeclaration, NewLineKind, NodeFlags, Printer, Statement, SyntaxKind } from "typescript";

import { EnumBuilder, TableBuilder } from "./builders";
import SchemaInfo from "./database";
import TypeMapper from "./TypeMapper";

export interface GeneratorOptions {
  dbUrl: string
  schema: string
  newline?: 'lf' | 'crlf'
}

export default class Generator {
  private printer: Printer
  private schema: SchemaInfo
  private types: TypeMapper

  constructor({
    newline = 'lf',
    ...options
  }: GeneratorOptions) {
    if (newline !== 'lf' && newline !== 'crlf') {
      console.warn(`Unknown newline type '${newline}' received. Acceptable values: lf, crlf. Defaulting to 'lf'.`)
    }

    this.printer = createPrinter({
      newLine: newline === 'crlf' ? NewLineKind.CarriageReturnLineFeed : NewLineKind.LineFeed
    })

    this.schema = new SchemaInfo(options.dbUrl, options.schema)
    this.types = new TypeMapper()
  }

  public async destroy() {
    await this.schema.disconnect()
  }

  public async build(): Promise<string> {
    const statements: Statement[] = []

    statements.push(...await this.buildEnums())
    statements.push(...await this.buildTables())
    const sourceFile = factory.createSourceFile(statements, factory.createToken(SyntaxKind.EndOfFileToken), NodeFlags.None)

    return this.printer.printFile(sourceFile)
  }

  private async buildEnums(): Promise<EnumDeclaration[]> {
    const enums = await this.schema.getEnums()

    return enums.map((enumInfo) => {
      const builder = new EnumBuilder(enumInfo)
      this.types.registerType(builder.name, builder.typeName)
      return builder.buildDeclaration()
    })
  }

  private async buildTables(): Promise<InterfaceDeclaration[]> {
    const tables = await this.schema.getTables()

    return tables.map((tableInfo) => {
      const builder = new TableBuilder(tableInfo, this.types)
      return builder.buildDeclaration()
    })
  }
}
