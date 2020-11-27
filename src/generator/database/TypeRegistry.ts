import { factory, TypeNode } from 'typescript'

export const UNKNOWN = factory.createTypeReferenceNode('unknown')

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
  public readonly typeMap: Record<string, string>

  constructor() {
    this.typeMap = { ...defaultTypeMap }
  }

  public has(typename: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.typeMap, typename)
  }

  public get(typename: string): TypeNode {
    if (this.has(typename)) {
      return factory.createTypeReferenceNode(this.typeMap[typename])
    }

    console.warn(`Unknown type detected: '${typename}'. You have either disabled generation of the type or this is a bug.`)
    this.add(typename, 'unknown')

    return UNKNOWN
  }

  public add(typename: string, target: string): void {
    if (this.has(typename)) {
      console.warn(`Re-registering known type '${typename}': ${this.typeMap[typename]} => ${target}`)
    }

    this.typeMap[typename] = target;
  }
}
