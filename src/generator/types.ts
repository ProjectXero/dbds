export interface CaseFunction {
  (value: string): string
}

export namespace Transformations {
  export type Column = 'snake' | 'camel' | 'none'
  export type EnumMember = 'constant' | 'pascal' | 'camel' | 'snake' | 'none'
  export type TypeName = 'constant' | 'pascal' | 'camel'
}

export interface Transformations {
  columns: CaseFunction
  enumMembers: CaseFunction
  typeNames: CaseFunction
}
