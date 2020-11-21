import { factory, PropertySignature, SyntaxKind, TypeNode } from 'typescript'

import { ColumnInfo } from '../database'
import TypeMapper from '../TypeMapper'

export default class ColumnBuilder implements ColumnInfo {
  public readonly name: string
  public readonly nullable: boolean
  public readonly hasDefault: boolean
  public readonly isArray: boolean
  public readonly order: number
  public readonly type: string

  private types: TypeMapper

  constructor(options: ColumnInfo, types: TypeMapper) {
    this.name = options.name
    this.hasDefault = options.hasDefault
    this.isArray = options.isArray
    this.nullable = options.nullable
    this.order = options.order
    this.type = options.type

    this.types = types
  }

  public buildSignature(): PropertySignature {
    const name = factory.createIdentifier(this.name)

    const type = this.buildType()
    /* no question token for now; this is needed on input types but not output types */
    // const questionToken = this.nullable ? factory.createToken(SyntaxKind.QuestionToken) : undefined

    return factory.createPropertySignature(undefined, name, undefined, type)
  }

  public buildType(): TypeNode {
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
}
