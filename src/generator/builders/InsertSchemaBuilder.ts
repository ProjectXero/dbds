import { factory, Identifier, Expression, CallExpression } from 'typescript'

import SelectSchemaBuilder from './SelectSchemaBuilder'

export default class InsertSchemaBuilder extends SelectSchemaBuilder {
  protected override readonly suffix = '$InsertSchema'

  protected override buildSinglePropertyEntry(
    columnInfo: typeof this.columns[0]
  ): [Identifier, Expression, string] {
    const [name, origValue, type] = super.buildSinglePropertyEntry(columnInfo)
    let value = origValue

    if (columnInfo.hasDefault || columnInfo.nullable) {
      value = factory.createCallExpression(
        factory.createPropertyAccessExpression(value, 'optional'),
        undefined,
        undefined
      )
    }

    if (!columnInfo.updatable) {
      value = factory.createCallExpression(
        factory.createPropertyAccessExpression(this.zod(), 'undefined'),
        undefined,
        undefined
      )
    }

    if (columnInfo.hasDefault) {
      value = factory.createCallExpression(
        factory.createPropertyAccessExpression(value, 'or'),
        undefined,
        [this.buildDefault()]
      )
    }

    return [name, value, type]
  }

  protected buildDefault(): CallExpression {
    return factory.createCallExpression(
      factory.createPropertyAccessExpression(this.zod(), 'literal'),
      undefined,
      [factory.createIdentifier('DEFAULT')]
    )
  }
}
