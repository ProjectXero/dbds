import { factory, SyntaxKind, Node } from 'typescript'

import { TypeRegistry } from '../database'
import { Transformations } from '../types'

export const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default abstract class NodeBuilder<T extends Node> {

  constructor(
    public readonly name: string,
    protected readonly types: TypeRegistry,
    protected readonly transform: Transformations
  ) { }

  public abstract buildNode(): T
}
