import {
  factory,
  VariableStatement,
  PropertyAssignment,
  SyntaxKind,
  NodeFlags,
  Identifier,
  KeywordTypeSyntaxKind,
  AsExpression,
} from 'typescript'
import { z } from 'zod'

import { ColumnInfo, TableInfoWithColumns, TypeRegistry } from '../database'
import { Transformations } from '../types'

import { ColumnMetadataBuilder } from './ColumnMetadataBuilder'
import { ExportKeyword } from './NodeBuilder'
import TypeBuilder from './TypeBuilder'

export default class TypeObjectBuilder extends TypeBuilder<VariableStatement> {
  public readonly canInsert: boolean
  public readonly columns: readonly z.infer<typeof ColumnInfo>[]

  constructor(
    options: z.infer<typeof TableInfoWithColumns>,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildSingleProperty(
    name: string,
    value: string
  ): PropertyAssignment {
    return factory.createPropertyAssignment(
      factory.createIdentifier(name),
      factory.createStringLiteral(value)
    )
  }

  protected buildProperties(): PropertyAssignment[] {
    return this.columns.map<PropertyAssignment>((columnInfo) => {
      const builder = new ColumnMetadataBuilder(
        columnInfo,
        this.types,
        this.transform
      )
      const metadataNode = builder.buildNode()
      return factory.createPropertyAssignment(
        this.transform.columns(columnInfo.name),
        metadataNode
      )
    })
  }

  protected buildObjectLiteral(): AsExpression {
    const properties = this.buildProperties()

    return factory.createAsExpression(
      factory.createObjectLiteralExpression(properties, true),
      factory.createKeywordTypeNode(
        SyntaxKind.ConstKeyword as KeywordTypeSyntaxKind
      )
    )
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(super.typename(name).text + '$Metadata')
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      this.typename(),
      undefined,
      undefined,
      this.buildObjectLiteral()
    )

    const declarationList = factory.createVariableDeclarationList(
      [declaration],
      NodeFlags.Const
    )

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }
}
