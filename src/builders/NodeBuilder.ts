import { factory, SyntaxKind, Node } from 'typescript'

import { TypeMapper } from '../database'

export const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default abstract class NodeBuilder<T extends Node> {

  constructor(public readonly name: string, protected readonly types: TypeMapper) { }

  public abstract buildNode(): T;
}
