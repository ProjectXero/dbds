import { factory, SyntaxKind, Node } from 'typescript'

import { TypeRegistry } from '../database'

export const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default abstract class NodeBuilder<T extends Node> {

  constructor(public readonly name: string, protected readonly types: TypeRegistry) { }

  public abstract buildNode(): T;
}
