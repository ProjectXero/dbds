import { factory, Identifier, InterfaceDeclaration, SyntaxKind, TypeElement } from 'typescript'

import TypeMapper from '../TypeMapper'
import { ColumnInfo, TableInfo } from '../database'

import ColumnBuilder from './ColumnBuilder'

const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default class TableBuilder {
  public readonly name: string
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(options: TableInfo, protected readonly types: TypeMapper) {
    this.name = options.name
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  public get typeName(): Identifier {
    return this.types.getIdentifier(this.name)
  }

  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types)
      return builder.buildSignature()
    })
  }

  public buildDeclaration(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    return factory.createInterfaceDeclaration(undefined, [ExportKeyword], this.typeName, undefined, undefined, members)
  }
}
