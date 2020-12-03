import { factory, Node, Identifier } from 'typescript'

import { TypeRegistry } from '../database'
import { Transformations } from '../types'

import NodeBuilder from './NodeBuilder'

export default abstract class TypeBuilder<
  T extends Node
> extends NodeBuilder<T> {
  constructor(name: string, types: TypeRegistry, transform: Transformations) {
    super(name, types, transform)
  }

  public typename(name: string = this.name): Identifier {
    return this.createIdentifier(this.transform.typeNames(name))
  }

  protected createIdentifier(text: string) {
    return factory.createIdentifier(text)
  }
}
