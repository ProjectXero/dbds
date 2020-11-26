import { factory, InterfaceDeclaration, TypeElement } from 'typescript'

import { ColumnInfo, TableInfo, TypeRegistry } from '../database'

import { ExportKeyword } from './NodeBuilder'
import ColumnBuilder from './ColumnBuilder'
import TypeBuilder, { CaseFunction } from './TypeBuilder'

export default class TableBuilder extends TypeBuilder<InterfaceDeclaration> {
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(options: TableInfo, types: TypeRegistry, convertCase: CaseFunction) {
    super(options.name, types, convertCase)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types)
      return builder.buildNode()
    })
  }

  public buildNode(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    return factory.createInterfaceDeclaration(undefined, [ExportKeyword], this.typename(), undefined, undefined, members)
  }
}
