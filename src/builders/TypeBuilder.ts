import { factory, Node, Identifier } from 'typescript'

import TypeMapper from '../TypeMapper'

import NodeBuilder from './NodeBuilder'

export interface CaseFunction {
  (value: string): string
}

export default abstract class TypeBuilder<T extends Node> extends NodeBuilder<T> {
  constructor(name: string, types: TypeMapper, protected readonly convertCase: CaseFunction) {
    super(name, types)
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(this.convertCase(name))
  }

  protected createIdentifier(text: string) {
    return factory.createIdentifier(text)
  }
}
