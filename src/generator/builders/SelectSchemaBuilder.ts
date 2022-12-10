import {
  factory,
  VariableStatement,
  PropertyAssignment,
  NodeFlags,
  Identifier,
  CallExpression,
  Expression,
} from 'typescript'
import { z } from 'zod'

import { ColumnInfo, TableInfoWithColumns, TypeRegistry } from '../database'
import { Transformations } from '../types'

import { ExportKeyword } from './NodeBuilder'
import TypeBuilder from './TypeBuilder'

// eslint-disable-next-line max-len
export default class SelectSchemaBuilder extends TypeBuilder<VariableStatement> {
  public readonly canInsert: boolean
  public readonly columns: readonly z.infer<typeof ColumnInfo>[]

  constructor(
    options: z.infer<typeof TableInfoWithColumns>,
    protected types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected zod(): Identifier {
    return factory.createIdentifier('z')
  }

  protected buildProperties(): PropertyAssignment[] {
    return this.columns.map<PropertyAssignment>((columnInfo) => {
      const name = factory.createIdentifier(
        this.transform.columns(columnInfo.name)
      )

      let value: Expression
      const nativeType = this.types.getText(columnInfo.type)
      const type = this.types.getType(columnInfo.type)

      if (type === 'table') {
        value = this.typename(nativeType)
      } else if (type === 'enum') {
        value = this.buildZodFunctionCall(
          'nativeEnum',
          factory.createIdentifier(nativeType)
        )
      } else {
        value = this.buildZodFunctionCall(nativeType)
      }

      if (columnInfo.isArray) {
        value = this.buildZodFunctionCall('array', value)
      }

      if (columnInfo.nullable) {
        value = factory.createCallExpression(
          factory.createPropertyAccessExpression(value, 'nullable'),
          undefined,
          undefined
        )
      }

      return factory.createPropertyAssignment(name, value)
    })
  }

  protected buildZodFunctionCall(
    functionName: string,
    ...args: readonly Expression[]
  ): CallExpression {
    return factory.createCallExpression(
      factory.createPropertyAccessExpression(this.zod(), functionName),
      undefined,
      args
    )
  }

  protected buildSchemaDefinition(): CallExpression {
    const properties = this.buildProperties()

    return this.buildZodFunctionCall(
      'object',
      factory.createObjectLiteralExpression(properties, true)
    )
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(super.typename(name).text + '$SelectSchema')
  }

  public buildNode(): VariableStatement {
    const declaration = factory.createVariableDeclaration(
      this.typename(),
      undefined,
      undefined,
      this.buildSchemaDefinition()
    )

    const declarationList = factory.createVariableDeclarationList(
      [declaration],
      NodeFlags.Const
    )

    return factory.createVariableStatement([ExportKeyword], declarationList)
  }
}
