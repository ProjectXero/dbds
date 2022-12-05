import { factory, PropertyAssignment } from 'typescript'
import { z } from 'zod'

import { ColumnInfo, TypeRegistry } from '../database'
import { Transformations } from '../types'

import NodeBuilder from './NodeBuilder'

export default class ColumnBuilder extends NodeBuilder<PropertyAssignment> {
  public readonly type: string

  constructor(
    options: z.infer<typeof ColumnInfo>,
    types: TypeRegistry,
    transform: Transformations
  ) {
    super(options.name, types, transform)
    this.type = options.type
  }

  public buildNode(): PropertyAssignment {
    const name = factory.createIdentifier(this.transform.columns(this.name))
    const value = factory.createStringLiteral(this.type)

    return factory.createPropertyAssignment(name, value)
  }
}
