export interface CaseFunction {
  (value: string): string
}

/* eslint @typescript-eslint/no-namespace: "off"
    -----
    I like the namespace for this particular case, so we'll make an exception
    here. */
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
