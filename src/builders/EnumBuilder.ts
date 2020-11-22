import { factory, EnumDeclaration, EnumMember, Identifier } from 'typescript'

import { EnumInfo } from '../database'
import TypeMapper from '../TypeMapper'
import { ExportKeyword } from './NodeBuilder'
import TypeBuilder, { CaseFunction } from './TypeBuilder'

export default class EnumBuilder extends TypeBuilder<EnumDeclaration> {
  public readonly values: readonly string[]

  constructor(options: EnumInfo, types: TypeMapper, convertCase: CaseFunction) {
    super(options.name, types, convertCase)
    this.values = options.values
  }


  public get members(): [Identifier, string][] {
    return this.values.map((value) => [this.typename(value), value])
  }

  protected buildMemberNodes(): EnumMember[] {
    return this.members.map(([name, value]) => {
      const expression = factory.createStringLiteral(value)
      return factory.createEnumMember(name, expression)
    })
  }

  public buildNode(): EnumDeclaration {
    const members = this.buildMemberNodes()

    return factory.createEnumDeclaration(undefined, [ExportKeyword], this.typename(), members)
  }
}
