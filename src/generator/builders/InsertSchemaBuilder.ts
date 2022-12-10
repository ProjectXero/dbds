import { factory, Identifier, Expression } from 'typescript'

import SelectSchemaBuilder from './SelectSchemaBuilder'

export default class InsertSchemaBuilder extends SelectSchemaBuilder {
  protected override readonly suffix = '$InsertSchema'

  protected override buildSinglePropertyEntry(
    columnInfo: typeof this.columns[0]
  ): [Identifier, Expression, string] {
    const [name, origValue, type] = super.buildSinglePropertyEntry(columnInfo)
    let value = origValue

    if (columnInfo.hasDefault) {
      value = factory.createCallExpression(
        factory.createPropertyAccessExpression(value, 'optional'),
        undefined,
        undefined
      )
      value = factory.createCallExpression(
        factory.createPropertyAccessExpression(value, 'or'),
        undefined,
        [
          factory.createCallExpression(
            factory.createPropertyAccessExpression(this.zod(), 'literal'),
            undefined,
            [factory.createIdentifier('DEFAULT')]
          ),
        ]
      )
    }

    return [name, value, type]
  }
}
