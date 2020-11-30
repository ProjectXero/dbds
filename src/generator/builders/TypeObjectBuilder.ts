import { factory, VariableStatement, PropertyAssignment, SyntaxKind, ObjectLiteralExpression, TypeNode, NodeFlags, Identifier } from 'typescript'

import { ColumnInfo, TableInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import ColumnTypeBuilder from './ColumnTypeBuilder'
import { ExportKeyword } from './NodeBuilder'
import TypeBuilder from './TypeBuilder'

export default class TypeObjectBuilder extends TypeBuilder<VariableStatement> {
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(options: TableInfo, types: TypeRegistry, transform: Transformations) {
    super(options.name, types, transform)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildProperties(): PropertyAssignment[] {
    return this.columns.map<PropertyAssignment>((columnInfo) => {
      const builder = new ColumnTypeBuilder(columnInfo, this.types, this.transform)
      return builder.buildNode()
    })
  }

  protected buildObjectLiteral(): ObjectLiteralExpression {
    const properties = this.buildProperties()
    return factory.createObjectLiteralExpression(properties, true)
  }

  protected buildType(): TypeNode {
    const parentType = factory.createTypeReferenceNode(super.typename())
    return factory.createTypeReferenceNode(
      'Record',
      [
        factory.createTypeOperatorNode(SyntaxKind.KeyOfKeyword, parentType),
        factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
      ]
    )
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(super.typename(name).text + '$Types')
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      this.typename(),
      undefined,
      this.buildType(),
      this.buildObjectLiteral()
    )

    const declarationList = factory.createVariableDeclarationList([declaration], NodeFlags.Const)

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }
}
