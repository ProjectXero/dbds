import {
  factory,
  Identifier,
  InterfaceDeclaration,
  SyntaxKind,
  TypeElement,
} from 'typescript'

import ColumnBuilder from './ColumnBuilder'
import TableBuilder from './TableBuilder'

export default class InsertTypeBuilder extends TableBuilder {
  protected buildMemberNodes(): TypeElement[] {
    return this.columns.map<TypeElement>((columnInfo) => {
      const builder = new ColumnBuilder(columnInfo, this.types, this.transform)
      let signature = builder.buildNode()

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
