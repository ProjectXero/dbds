import {
  factory,
  InterfaceDeclaration,
  PropertySignature,
  TypeParameterDeclaration,
} from 'typescript'

import { ColumnInfo, TableInfoWithColumns, TypeRegistry } from '../database'
import { Transformations } from '../types'

import { ExportKeyword } from './NodeBuilder'
import ColumnBuilder from './ColumnBuilder'
import TypeBuilder from './TypeBuilder'
import { SerializableValueType } from './UtilityTypesBuilder'
import { z } from 'zod'

const parameterTypes = ['json', 'jsonb']

export default class TableBuilder extends TypeBuilder<InterfaceDeclaration> {
  public readonly canInsert: boolean
  public readonly columns: readonly z.infer<typeof ColumnInfo>[]

  private typeParameters: Set<string> = new Set()

  constructor(
    options: z.infer<typeof TableInfoWithColumns>,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.canInsert = options.canInsert
    this.columns = options.columns
  }

  protected buildMemberNodes(): PropertySignature[] {
    return this.columns.map<PropertySignature>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types, this.transform)
      if (parameterTypes.includes(builder.type)) {
        const paramName = this.transform.typeNames(`t_${builder.name}`)
        builder.overrideType = factory.createTypeReferenceNode(
          'MapToSerializable',
          [factory.createTypeReferenceNode(paramName)]
        )
        this.typeParameters.add(paramName)
      }
      return builder.buildNode()
    })
  }

  protected buildTypeParams(): TypeParameterDeclaration[] | undefined {
    if (this.typeParameters.size === 0) {
      return
    }

    const serializable = factory.createTypeReferenceNode(SerializableValueType)

    return Array.from(this.typeParameters).map<TypeParameterDeclaration>(
      (name) => {
        return factory.createTypeParameterDeclaration(
          undefined,
          name,
          undefined,
          serializable
        )
      }
    )
  }

  public buildNode(): InterfaceDeclaration {
    const members = this.buildMemberNodes()
    const typeParameters = this.buildTypeParams()
    return factory.createInterfaceDeclaration(
      [ExportKeyword],
      this.typename(),
      typeParameters,
      undefined,
      members
    )
  }
}
