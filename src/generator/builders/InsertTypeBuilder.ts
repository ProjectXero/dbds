import {
  factory,
  Identifier,
  InterfaceDeclaration,
  PropertySignature,
  SyntaxKind,
} from 'typescript'

import TableBuilder from './TableBuilder'

export default class InsertTypeBuilder extends TableBuilder {
  protected buildMemberNodes(): PropertySignature[] {
    return super.buildMemberNodes().map<PropertySignature>((signature, idx) => {
      const columnInfo = this.columns[idx]
      if (columnInfo.hasDefault || columnInfo.nullable) {
        signature = factory.updatePropertySignature(
          signature,
          signature.modifiers,
          signature.name,
          factory.createToken(SyntaxKind.QuestionToken),
          signature.type
        )
      }
      return signature
    })
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(super.typename(name).text + '$Insert')
  }

  public buildNode(): InterfaceDeclaration {
    let declaration = super.buildNode()
    declaration = factory.updateInterfaceDeclaration(
      declaration,
      declaration.decorators,
      declaration.modifiers,
      this.typename(),
      declaration.typeParameters,
      declaration.heritageClauses,
      declaration.members
    )
    return declaration
  }
}
