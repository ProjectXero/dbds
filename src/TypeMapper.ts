import { factory, Identifier, TypeNode } from 'typescript'

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

export default class TypeMapper {
  public readonly typeMap: Record<string, string>

  constructor(protected readonly caseConversion: (value: string) => string) {
    this.typeMap = { ...defaultTypeMap }
  }

  public isKnownType(typeName: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.typeMap, typeName)
  }

  public getIdentifier(typeName: string): Identifier {
    return factory.createIdentifier(this.caseConversion(typeName))
  }

  public getTypeNode(typeName: string): TypeNode {
    if (this.isKnownType(typeName)) {
      return factory.createTypeReferenceNode(this.typeMap[typeName])
    }

    console.warn(`Unknown type detected: '${typeName}'. This might be a bug/limitation.`)

    return UNKNOWN
  }

  public registerType(typeName: string, target: string): void {
    if (this.isKnownType(typeName)) {
      console.warn(`Re-registering known type '${typeName}': ${this.typeMap[typeName]} => ${target}`)
    }

    this.typeMap[typeName] = target;
  }
}
