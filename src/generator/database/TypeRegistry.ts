import { factory, TypeNode } from 'typescript'

export const defaultTypeMap = Object.freeze({
  bpchar: 'string',
  char: 'string',
  varchar: 'string',
  text: 'string',
  citext: 'string',
  uuid: 'string',
  bytea: 'string',
  inet: 'string',
  time: 'string',
  timetz: 'string',
  interval: 'string',
  name: 'string',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  money: 'number',
  oid: 'number',
  bool: 'boolean',
  json: 'unknown',
  jsonb: 'unknown',
  date: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
})

export default class TypeRegistry {
  public readonly typeMap: Record<
    string,
    string | { name: string; type: string }
  >

  constructor() {
    this.typeMap = { ...defaultTypeMap }
  }

  public has(typename: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.typeMap, typename)
  }

  public get(typename: string): TypeNode {
    return factory.createTypeReferenceNode(this.getText(typename))
  }

  public getText(typename: string): string {
    if (this.has(typename)) {
      const entry = this.typeMap[typename]
      if (typeof entry === 'string') {
        return entry
      }
      return entry.name
    }

    console.warn(
      `Unknown type detected: '${typename}'. ` +
        'You have either disabled generation of the type or this is a bug.'
    )

    return 'unknown'
  }

  public getType(typename: string): string {
    if (this.has(typename)) {
      const entry = this.typeMap[typename]
      if (typeof entry !== 'string') {
        return entry.type
      }
    }
    return 'unknown'
  }

  public add(typename: string, target: string, type?: string): void {
    if (this.has(typename)) {
      console.warn(
        `Re-registering known type '${typename}': ` +
          `${this.getText(typename)} => ${target}`
      )
    }

    if (typeof type === 'string') {
      this.typeMap[typename] = { name: target, type }
    } else {
      this.typeMap[typename] = target
    }
  }
}
