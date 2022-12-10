import { factory, PropertySignature, SyntaxKind, TypeNode } from 'typescript'
import { z } from 'zod'

import { ColumnInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import NodeBuilder from './NodeBuilder'

export default class ColumnBuilder
  extends NodeBuilder<PropertySignature>
  implements z.infer<typeof ColumnInfo>
{
  public readonly nullable: boolean
  public readonly hasDefault: boolean
  public readonly isArray: boolean
  public readonly order: number
  public readonly type: string
  public readonly updatable: boolean

  public overrideType?: TypeNode

  constructor(
    options: z.infer<typeof ColumnInfo>,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.hasDefault = options.hasDefault
    this.isArray = options.isArray
    this.nullable = options.nullable
    this.order = options.order
    this.type = options.type
    this.updatable = options.updatable
  }

  protected buildType(): TypeNode {
    let typename = this.overrideType || this.types.get(this.type)

    if (this.isArray) {
      typename = factory.createArrayTypeNode(typename)
    }

    if (this.nullable) {
      typename = factory.createUnionTypeNode([
        typename,
        factory.createLiteralTypeNode(
          factory.createToken(SyntaxKind.NullKeyword)
        ),
      ])
    }

    return typename
  }

  public buildNode(): PropertySignature {
    const name = factory.createIdentifier(this.transform.columns(this.name))

    const type = this.buildType()

    return factory.createPropertySignature(undefined, name, undefined, type)
  }
}
