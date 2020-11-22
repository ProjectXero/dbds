import { pascal } from 'case'
import { factory, SyntaxKind } from 'typescript'

import { EnumInfo } from '../database'

const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)
const DeclareKeyword = factory.createModifier(SyntaxKind.DeclareKeyword)

export default class EnumBuilder {
  public readonly name: string
  public readonly values: readonly string[]

  constructor(options: EnumInfo) {
    this.name = options.name
    this.values = options.values
  }

  public get typeName(): string {
    return pascal(this.name)
  }

  public get members(): [string, string][] {
    return this.values.map((value) => [pascal(value), value])
  }

  protected buildMemberNodes() {
    return this.members.map(([name, value]) => {
      const expression = factory.createStringLiteral(value)
      return factory.createEnumMember(name, expression)
    })
  }

  public buildDeclaration() {
    const members = this.buildMemberNodes()

    return factory.createEnumDeclaration(undefined, [ExportKeyword, DeclareKeyword], this.typeName, members)
  }
}
