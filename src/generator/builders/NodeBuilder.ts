import { factory, SyntaxKind, Node } from 'typescript'

import { TypeRegistry } from '../database'
import { Transformations } from '../types'

export const ExportKeyword = factory.createModifier(SyntaxKind.ExportKeyword)

export default abstract class NodeBuilder<T extends Node> {
  constructor(
    public readonly name: string,
    protected readonly types: TypeRegistry,
    protected readonly transform: Transformations
  ) {}

  public abstract buildNode(): T
}

export interface SingleBuildable<T extends Node> {
  buildNode(): T
}

export interface MultiBuildable<T extends Node> {
  buildNodes(): T[]
}

export type Buildable<T extends Node> = SingleBuildable<T> | MultiBuildable<T>

export function isMultiBuildable<T extends Node>(
  builder: Buildable<T>
): builder is MultiBuildable<T> {
  return Reflect.has(builder, 'buildNodes')
}
