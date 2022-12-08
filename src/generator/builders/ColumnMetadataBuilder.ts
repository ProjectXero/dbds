import {
  factory,
  ObjectLiteralExpression,
  PropertyAssignment,
} from 'typescript'
import { z } from 'zod'

import { ColumnInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import NodeBuilder from './NodeBuilder'

// eslint-disable-next-line max-len
export class ColumnMetadataBuilder extends NodeBuilder<ObjectLiteralExpression> {
  public readonly type: string

  constructor(
    protected options: z.infer<typeof ColumnInfo>,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.type = options.type
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
    return [
      this.buildSingleProperty('nativeName', this.options.name),
      this.buildSingleProperty('nativeType', this.options.type),
    ]
  }

  public buildNode(): ObjectLiteralExpression {
    return factory.createObjectLiteralExpression(this.buildProperties(), true)
  }
}
