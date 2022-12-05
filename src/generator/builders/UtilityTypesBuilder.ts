import {
  factory,
  Identifier,
  SyntaxKind,
  TypeAliasDeclaration,
  TypeNode,
} from 'typescript'
import { ExportKeyword } from './NodeBuilder'

export const PrimitiveValueType = 'PrimitiveValueType'
export const SimpleValueType = 'SimpleValueType'
export const SerializableValueType = 'SerializableValueType'
export const MapToSerializable = 'MapToSerializable'

export default class UtilityTypesBuilder {
  private buildPrimitiveValueType(): TypeAliasDeclaration {
    const type: TypeNode = factory.createUnionTypeNode([
      factory.createTypeReferenceNode('string'),
      factory.createTypeReferenceNode('number'),
      factory.createTypeReferenceNode('boolean'),
      factory.createTypeReferenceNode('null'),
    ])

    return factory.createTypeAliasDeclaration(
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
      undefined,
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
        ]),
        undefined
      )
    )

    types.push(
      factory.createTypeReferenceNode('Array', [typename]),
      factory.createTypeReferenceNode('ReadonlyArray', [typename])
    )

    const type: TypeNode = factory.createUnionTypeNode(types)

    return factory.createTypeAliasDeclaration(
      [ExportKeyword],
      SerializableValueType,
      undefined,
      type
    )
  }

  private buildMapToSerializable(): TypeAliasDeclaration {
    const tParam = 'T'
    const uParam = 'U'
    const kParam = 'K'

    const T = factory.createTypeReferenceNode(tParam)
    const U = factory.createTypeReferenceNode(uParam)
    const K = factory.createTypeReferenceNode(kParam)
    const TK = factory.createIndexedAccessTypeNode(T, K)
    const never = factory.createKeywordTypeNode(SyntaxKind.NeverKeyword)

    const inferU = factory.createInferTypeNode(
      factory.createTypeParameterDeclaration(undefined, uParam)
    )

    const simple = factory.createTypeReferenceNode(SimpleValueType)
    const serializable = factory.createTypeReferenceNode(SerializableValueType)

    const functionCheck = factory.createConditionalTypeNode(
      TK,
      factory.createTypeReferenceNode('Function'),
      never,
      factory.createTypeReferenceNode(MapToSerializable, [TK])
    )

    const serializableObjectCheck = factory.createConditionalTypeNode(
      TK,
      simple,
      TK,
      functionCheck
    )

    const stringKeyCheck = factory.createConditionalTypeNode(
      K,
      factory.createKeywordTypeNode(SyntaxKind.StringKeyword),
      serializableObjectCheck,
      never
    )

    const mappedObjectType = factory.createMappedTypeNode(
      undefined,
      factory.createTypeParameterDeclaration(
        undefined,
        kParam,
        factory.createTypeOperatorNode(SyntaxKind.KeyOfKeyword, T),
        undefined
      ),
      undefined,
      undefined,
      stringKeyCheck,
      undefined
    )

    const objectCheck = factory.createConditionalTypeNode(
      T,
      mappedObjectType,
      T,
      never
    )

    const readonlyArrayCheck = factory.createConditionalTypeNode(
      T,
      factory.createTypeReferenceNode('ReadonlyArray', [inferU]),
      factory.createTypeReferenceNode('ReadonlyArray', [
        factory.createTypeReferenceNode(MapToSerializable, [U]),
      ]),
      objectCheck
    )

    const arrayCheck = factory.createConditionalTypeNode(
      T,
      factory.createTypeReferenceNode('Array', [inferU]),
      factory.createTypeReferenceNode('Array', [
        factory.createTypeReferenceNode(MapToSerializable, [U]),
      ]),
      readonlyArrayCheck
    )

    const type = factory.createConditionalTypeNode(
      T,
      serializable,
      T,
      arrayCheck
    )

    const typeParameters = [
      factory.createTypeParameterDeclaration(
        undefined,
        tParam,
        undefined,
        undefined
      ),
    ]
    return factory.createTypeAliasDeclaration(
      [ExportKeyword],
      MapToSerializable,
      typeParameters,
      type
    )
  }

  public buildNodes(): TypeAliasDeclaration[] {
    const primitiveType = this.buildPrimitiveValueType()
    const simpleType = this.buildSimpleValueType(primitiveType.name)
    const serialzableType = this.buildSerializableValueType(simpleType.name)
    const mapToSerialize = this.buildMapToSerializable()
    return [primitiveType, simpleType, serialzableType, mapToSerialize]
  }
}
