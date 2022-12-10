import { factory, ImportDeclaration } from 'typescript'
import { identity } from '../../datasource/loaders/utils'

import { TypeRegistry } from '../database'
import { Transformations } from '../types'

import TypeBuilder from './TypeBuilder'

export type SingleNamedImportOptions = {
  name: string
  source: string
}

// eslint-disable-next-line max-len
export default class SingleNamedImportBuilder extends TypeBuilder<ImportDeclaration> {
  constructor(
    protected readonly options: SingleNamedImportOptions,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, {
      ...transform,
      typeNames: identity,
    })
  }

  public buildNode(): ImportDeclaration {
    const imports = factory.createNamedImports([
      factory.createImportSpecifier(false, undefined, this.typename()),
    ])
    const importClause = factory.createImportClause(false, undefined, imports)
    return factory.createImportDeclaration(
      undefined,
      importClause,
      factory.createStringLiteral(this.options.source)
    )
  }
}
