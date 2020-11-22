import { pascal } from 'case'
import { factory, InterfaceDeclaration, SyntaxKind, TypeElement } from 'typescript'

import ColumnBuilder from './ColumnBuilder'
import TypeMapper from '../TypeMapper'
import { ColumnInfo, TableInfo } from '../database'

const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)
const DeclareKeyword = factory.createModifier(SyntaxKind.DeclareKeyword)

export default class TableBuilder {
  public readonly name: string
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  protected types: TypeMapper

  constructor(options: TableInfo, types: TypeMapper) {
    this.name = options.name
    this.canInsert = options.canInsert
    this.columns = options.columns

    this.types = types
  }

  public get typeName(): string {
    return pascal(this.name)
  }

  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types)
      return builder.buildSignature()
    })
  }

  public buildDeclaration(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    return factory.createInterfaceDeclaration(undefined, [ExportKeyword, DeclareKeyword], this.typeName, undefined, undefined, members)
  }
}
