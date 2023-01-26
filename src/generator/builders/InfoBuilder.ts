import {
  factory,
  VariableStatement,
  NodeFlags,
  ObjectLiteralExpression,
} from 'typescript'
import { z } from 'zod'
import { TableInfoWithColumns, TypeRegistry } from '../database'
import { Transformations } from '../types'
import InsertSchemaBuilder from './InsertSchemaBuilder'
import { ExportKeyword } from './NodeBuilder'
import SelectSchemaBuilder from './SelectSchemaBuilder'
import TableMetadataBuilder from './TableMetadataBuilder'

import TypeBuilder from './TypeBuilder'
import UpdateSchemaBuilder from './UpdateSchemaBuilder'

export default class InfoBuilder extends TypeBuilder<VariableStatement> {
  constructor(
    options: z.infer<typeof TableInfoWithColumns>,
    protected types: TypeRegistry,
    transform: Transformations,
    private readonly insertSchemaBuilder: InsertSchemaBuilder,
    private readonly selectSchemaBuilder: SelectSchemaBuilder,
    private readonly updateSchemaBuilder: UpdateSchemaBuilder,
    private readonly tableMetadataBuilder: TableMetadataBuilder
  ) {
    super(options.name, types, transform)
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      `${this.typename().text}Info`,
      undefined,
      undefined,
      this.buildInfoDefinition()
    )

    const declarationList = factory.createVariableDeclarationList(
      [declaration],
      NodeFlags.Const
    )

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }

  protected buildInfoDefinition(): ObjectLiteralExpression {
    return factory.createObjectLiteralExpression(
      [
        factory.createPropertyAssignment(
          this.createIdentifier('metadata'),
          this.tableMetadataBuilder.typename()
        ),
        factory.createPropertyAssignment(
          factory.createIdentifier('name'),
          factory.createStringLiteral(this.name)
        ),
        factory.createPropertyAssignment(
          factory.createIdentifier('schemas'),
          factory.createObjectLiteralExpression(
            [
              factory.createPropertyAssignment(
                this.createIdentifier('insert'),
                this.insertSchemaBuilder.typename()
              ),
              factory.createPropertyAssignment(
                this.createIdentifier('select'),
                this.selectSchemaBuilder.typename()
              ),
              factory.createPropertyAssignment(
                this.createIdentifier('update'),
                this.updateSchemaBuilder.typename()
              ),
            ],
            true
          )
        ),
      ],
      true
    )
  }
}
