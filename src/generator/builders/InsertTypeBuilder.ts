import { factory, SyntaxKind, TypeElement } from 'typescript'

import ColumnBuilder from './ColumnBuilder'
import TableBuilder from './TableBuilder'

export default class InsertTypeBuilder extends TableBuilder {
  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types)
      let signature = builder.buildNode()

      if (columnInfo.hasDefault) {
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

  public buildNode() {
    let declaration = super.buildNode()
    declaration = factory.updateInterfaceDeclaration(
      declaration,
      declaration.decorators,
      declaration.modifiers,
      factory.createIdentifier(declaration.name.text + '$Insert'),
      declaration.typeParameters,
      declaration.heritageClauses,
      declaration.members
    )
    return declaration
  }
}