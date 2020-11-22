import { factory, PropertySignature, SyntaxKind, TypeNode } from 'typescript'

import { ColumnInfo } from '../database'
import TypeMapper from '../TypeMapper'
import NodeBuilder from './NodeBuilder'

export default class ColumnBuilder extends NodeBuilder<PropertySignature> implements ColumnInfo {
  public readonly nullable: boolean
  public readonly hasDefault: boolean
  public readonly isArray: boolean
  public readonly order: number
  public readonly type: string

  constructor(options: ColumnInfo, types: TypeMapper) {
    super(options.name, types)
    this.hasDefault = options.hasDefault
    this.isArray = options.isArray
    this.nullable = options.nullable
    this.order = options.order
    this.type = options.type
  }

  protected buildType(): TypeNode {
    let typeName = this.types.getTypeNode(this.type)

    if (this.isArray) {
      typeName = factory.createArrayTypeNode(typeName)
    }

    if (this.nullable) {
      typeName = factory.createUnionTypeNode([
        typeName,
        factory.createLiteralTypeNode(factory.createToken(SyntaxKind.NullKeyword))
      ])
    }

    return typeName
  }

  public buildNode(): PropertySignature {
    const name = factory.createIdentifier(this.name)

    const type = this.buildType()

    return factory.createPropertySignature(undefined, name, undefined, type)
  }

}
