import { factory, VariableStatement, PropertyAssignment, SyntaxKind, ObjectLiteralExpression, TypeNode, NodeFlags } from 'typescript'

import { ColumnInfo, TableInfo, TypeRegistry } from '../database'

import TypeBuilder, { CaseFunction } from './TypeBuilder'
import ColumnTypeBuilder from './ColumnTypeBuilder'
import { ExportKeyword } from './NodeBuilder'

export default class TypeObjectBuilder extends TypeBuilder<VariableStatement> {
  public readonly canInsert: boolean
  public readonly columns: readonly ColumnInfo[]

  constructor(options: TableInfo, types: TypeRegistry, convertCase: CaseFunction) {
    super(options.name, types, convertCase)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildProperties(): PropertyAssignment[] {
    return this.columns.map<PropertyAssignment>((columnInfo) => {
      const builder = new ColumnTypeBuilder(columnInfo, this.types)
      return builder.buildNode()
    })
  }

  protected buildObjectLiteral(): ObjectLiteralExpression {
    const properties = this.buildProperties()
    return factory.createObjectLiteralExpression(properties, true)
  }

  protected buildType(): TypeNode {
    const parentType = factory.createTypeReferenceNode(this.typename())
    return factory.createTypeReferenceNode(
      'Record',
      [
        factory.createTypeOperatorNode(SyntaxKind.KeyOfKeyword, parentType),
        factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
      ]
    )
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      this.typename().text + '$Types',
      undefined,
      this.buildType(),
      this.buildObjectLiteral()
    )

    const declarationList = factory.createVariableDeclarationList([declaration], NodeFlags.Const)

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }
}
