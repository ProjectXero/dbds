import { factory, EnumDeclaration, EnumMember, Identifier } from 'typescript'

import { EnumInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import { ExportKeyword } from './NodeBuilder'
import TypeBuilder from './TypeBuilder'

export default class EnumBuilder extends TypeBuilder<EnumDeclaration> {
  public readonly values: readonly string[]

  constructor(
    options: EnumInfo,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.values = options.values
  }

  public get members(): [Identifier, string][] {
    return this.values.map((value) => [
      this.createIdentifier(this.transform.enumMembers(value)),
      value,
    ])
  }

  protected buildMemberNodes(): EnumMember[] {
    return this.members.map(([name, value]) => {
      const expression = factory.createStringLiteral(value)
      return factory.createEnumMember(name, expression)
    })
  }

  public buildNode(): EnumDeclaration {
    const members = this.buildMemberNodes()

    return factory.createEnumDeclaration(
      undefined,
      [ExportKeyword],
      this.typename(),
      members
    )
  }
}
