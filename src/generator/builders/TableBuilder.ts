import { factory, InterfaceDeclaration, PropertySignature } from 'typescript'

import { ColumnInfo, TableInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import { ExportKeyword } from './NodeBuilder'
import ColumnBuilder from './ColumnBuilder'
import TypeBuilder from './TypeBuilder'

export default class TableBuilder extends TypeBuilder<InterfaceDeclaration> {
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(
    options: TableInfo,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildMemberNodes(): PropertySignature[] {
    return this.columns.map<PropertySignature>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types, this.transform)
      return builder.buildNode()
    })
  }

  public buildNode(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    return factory.createInterfaceDeclaration(
      undefined,
      [ExportKeyword],
      this.typename(),
      undefined,
      undefined,
      members
    )
  }
}
