import { EnumDeclaration, EnumMember, factory, Identifier, SyntaxKind } from 'typescript'

import { EnumInfo } from '../database'
import TypeMapper from '../TypeMapper'

const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default class EnumBuilder {
  public readonly name: string
  public readonly values: readonly string[]

  constructor(options: EnumInfo, protected readonly types: TypeMapper) {
    this.name = options.name
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
