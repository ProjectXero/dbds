import { factory, PropertyAssignment } from 'typescript'

import { ColumnInfo, TypeRegistry } from '../database'
import NodeBuilder from './NodeBuilder'

export default class ColumnBuilder extends NodeBuilder<PropertyAssignment> {
  public readonly type: string

  constructor(options: ColumnInfo, types: TypeRegistry) {
    super(options.name, types)
    this.type = options.type
  }

  public buildNode(): PropertyAssignment {
    const name = factory.createIdentifier(this.name)
    const value = factory.createStringLiteral(this.type)

    return factory.createPropertyAssignment(name, value)
  }

}
