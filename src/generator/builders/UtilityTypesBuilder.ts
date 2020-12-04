import { factory, Identifier, TypeAliasDeclaration, TypeNode } from 'typescript'
import { ExportKeyword } from './NodeBuilder'

// export type PrimitiveValueType = string | number | boolean | null
// export type SimpleValueType = PrimitiveValueType | Date
// export type SerializableValueType =
//   | SimpleValueType
//   | {
//       [key in string]: SerializableValueType | undefined
//     }
//   | Array<SerializableValueType>
//   | ReadonlyArray<SerializableValueType>

export const PrimitiveValueType = 'PrimitiveValueType'
export const SimpleValueType = 'SimpleValueType'
export const SerializableValueType = 'SerializableValueType'

export default class UtilityTypesBuilder {
  private buildPrimitiveValueType(): TypeAliasDeclaration {
    const type: TypeNode = factory.createUnionTypeNode([
      factory.createTypeReferenceNode('string'),
      factory.createTypeReferenceNode('number'),
      factory.createTypeReferenceNode('boolean'),
      factory.createTypeReferenceNode('null'),
    ])

    return factory.createTypeAliasDeclaration(
      undefined,
      [ExportKeyword],
      PrimitiveValueType,
      undefined,
      type
    )
  }

  private buildSimpleValueType(
    primitiveType: Identifier
  ): TypeAliasDeclaration {
    const type: TypeNode = factory.createUnionTypeNode([
      factory.createTypeReferenceNode(primitiveType),
      factory.createTypeReferenceNode('Date'),
    ])

    return factory.createTypeAliasDeclaration(
      undefined,
      [ExportKeyword],
      SimpleValueType,
      undefined,
      type
    )
  }

  private buildSerializableValueType(
    simpleType: Identifier
  ): TypeAliasDeclaration {
    const types: TypeNode[] = [factory.createTypeReferenceNode(simpleType)]
    const typename = factory.createTypeReferenceNode(SerializableValueType)

    const mappedKey = factory.createTypeParameterDeclaration(
      'key',
      factory.createTypeReferenceNode('string'),
      undefined
    )
    types.push(
      factory.createMappedTypeNode(
        undefined,
        mappedKey,
        undefined,
        undefined,
        factory.createUnionTypeNode([
          typename,
          factory.createTypeReferenceNode('undefined'),
        ])
      )
    )

    types.push(
      factory.createTypeReferenceNode('Array', [typename]),
      factory.createTypeReferenceNode('ReadonlyArray', [typename])
    )

    const type: TypeNode = factory.createUnionTypeNode(types)

    return factory.createTypeAliasDeclaration(
      undefined,
      [ExportKeyword],
      'SerializableValueType',
      undefined,
      type
    )
  }

  public buildNodes(): TypeAliasDeclaration[] {
    const primitiveType = this.buildPrimitiveValueType()
    const simpleType = this.buildSimpleValueType(primitiveType.name)
    const serialzableType = this.buildSerializableValueType(simpleType.name)
    return [primitiveType, simpleType, serialzableType]
  }
}
