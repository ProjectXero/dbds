import { factory, EnumDeclaration, EnumMember, Identifier } from 'typescript'

import { EnumInfo } from '../database'
import TypeMapper from '../TypeMapper'
import BuilderBase, { ExportKeyword } from './BuilderBase'

export default class EnumBuilder extends BuilderBase<EnumDeclaration> {
  public readonly values: readonly string[]

  constructor(options: EnumInfo, types: TypeMapper) {
    super(options.name, types)
    this.values = options.values
  }

  public get typeName(): Identifier {
    return this.types.getIdentifier(this.name)
  }

  public get members(): [Identifier, string][] {
    return this.values.map((value) => [this.types.getIdentifier(value), value])
  }

  protected buildMemberNodes(): EnumMember[] {
    return this.members.map(([name, value]) => {
      const expression = factory.createStringLiteral(value)
      return factory.createEnumMember(name, expression)
    })
  }

  public buildDeclaration(): EnumDeclaration {
    const members = this.buildMemberNodes()

    return factory.createEnumDeclaration(undefined, [ExportKeyword], this.typeName, members)
  }
}
