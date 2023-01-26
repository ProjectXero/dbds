import { factory, VariableStatement, NodeFlags } from 'typescript'
import { z } from 'zod'

import InsertSchemaBuilder from './InsertSchemaBuilder'
import SelectSchemaBuilder from './SelectSchemaBuilder'
import { ExportKeyword } from './NodeBuilder'
import { TableInfoWithColumns, TypeRegistry } from '../database'
import { Transformations } from '../types'

export default class UpdateSchemaBuilder extends SelectSchemaBuilder {
  protected override readonly suffix: string = '$UpdateSchema'
  insertSchemabuilder: InsertSchemaBuilder

  constructor(
    options: z.infer<typeof TableInfoWithColumns>,
    protected types: TypeRegistry,
    transform: Transformations
  ) {
    super(options, types, transform)
    this.insertSchemabuilder = new InsertSchemaBuilder(
      options,
      types,
      transform
    )
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      this.typename(),
      undefined,
      undefined,
      factory.createCallExpression(
        factory.createPropertyAccessExpression(
          this.insertSchemabuilder.typename(),
          factory.createIdentifier('partial')
        ),
        undefined,
        []
      )
    )

    const declarationList = factory.createVariableDeclarationList(
      [declaration],
      NodeFlags.Const
    )

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }
}
