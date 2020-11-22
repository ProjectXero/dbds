import { factory, Identifier, InterfaceDeclaration, TypeElement } from 'typescript'

import TypeMapper from '../TypeMapper'
import { ColumnInfo, TableInfo } from '../database'

import BuilderBase, { ExportKeyword } from './BuilderBase'
import ColumnBuilder from './ColumnBuilder'

export default class TableBuilder extends BuilderBase<InterfaceDeclaration> {
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(options: TableInfo, types: TypeMapper) {
    super(options.name, types)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  public get typeName(): Identifier {
    return this.types.getIdentifier(this.name)
  }

  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types)
      return builder.buildDeclaration()
    })
  }

  public buildDeclaration(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    return factory.createInterfaceDeclaration(undefined, [ExportKeyword], this.typeName, undefined, undefined, members)
  }
}
