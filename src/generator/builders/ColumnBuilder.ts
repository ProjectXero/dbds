import { factory, PropertySignature, SyntaxKind, TypeNode } from 'typescript'

import { ColumnInfo, TypeRegistry } from '../database'
import NodeBuilder from './NodeBuilder'

export default class ColumnBuilder extends NodeBuilder<PropertySignature> implements ColumnInfo {
  public readonly nullable: boolean
  public readonly hasDefault: boolean
  public readonly isArray: boolean
  public readonly order: number
  public readonly type: string

  constructor(options: ColumnInfo, types: TypeRegistry) {
    super(options.name, types)
    this.hasDefault = options.hasDefault
    this.isArray = options.isArray
    this.nullable = options.nullable
    this.order = options.order
    this.type = options.type
  }

  protected buildType(): TypeNode {
    let typename = this.types.get(this.type)

    if (this.isArray) {
      typename = factory.createArrayTypeNode(typename)
    }

    if (this.nullable) {
      typename = factory.createUnionTypeNode([
        typename,
        factory.createLiteralTypeNode(factory.createToken(SyntaxKind.NullKeyword))
      ])
    }

    return typename
  }

  public buildNode(): PropertySignature {
    const name = factory.createIdentifier(this.name)

    const type = this.buildType()

    return factory.createPropertySignature(undefined, name, undefined, type)
  }

}
