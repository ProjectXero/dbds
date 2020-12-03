import { close, open, write } from 'fs'
import { promisify } from 'util'
import { Arguments, Argv, BuilderCallback } from 'yargs'

import { Generator } from '../..'

import { Params } from '../'
import { createPool } from 'slonik'
import { SchemaInfo } from '../../generator/database'
import { Transformations } from '../../generator/types'

const openAsync = promisify(open)
const closeAsync = promisify(close)
const writeAsync = promisify(write)

export const command = 'generate'
export const aliases: string[] = ['g', 'gen']
export const desc = 'Generate types for the database'

export interface GenerateParams extends Params {
  output: string
  genEnums: boolean
  genInsertTypes: boolean
  genTables: boolean
  genTypeObjects: boolean
  transformColumns: Transformations.Column
  transformEnumMembers: Transformations.EnumMember
  transformTypeNames: Transformations.TypeName
}

export const builder: BuilderCallback<Params, GenerateParams> = (yargs: Argv) =>
  yargs
    .usage('Usage: $0 generate')
    .options({
      output: {
        alias: 'o',
        requiresArg: true,
        type: 'string',
        description: 'Destination filename for generated types',
        default: '-',
        defaultDescription: 'STDOUT',
        group: 'Generation options',
      },
      'gen-tables': {
        type: 'boolean',
        description: 'Generate table types',
        default: true,
        group: 'Generation options',
      },
      'gen-enums': {
        type: 'boolean',
        description: 'Generate enum types',
        default: true,
        group: 'Generation options',
      },
      'gen-insert-types': {
        type: 'boolean',
        description: 'Generate table insert types',
        default: true,
        group: 'Generation options',
      },
      'gen-type-objects': {
        type: 'boolean',
        description: 'Generate column type objects',
        default: true,
        group: 'Generation options',
      },
      'transform-columns': {
        alias: 'C',
        requiresArg: true,
        choices: ['snake', 'camel', 'none'] as Transformations.Column[],
        description: 'Case conversion for column names',
        default: 'none' as Transformations.Column,
        group: 'Code style options',
      },
      'transform-enum-members': {
        alias: 'E',
        requiresArg: true,
        choices: [
          'constant',
          'pascal',
          'snake',
          'camel',
          'none',
        ] as Transformations.EnumMember[],
        description: 'Case conversion for enum type members',
        default: 'pascal' as Transformations.EnumMember,
        group: 'Code style options',
      },
      'transform-type-names': {
        alias: 'T',
        requiresArg: true,
        choices: ['camel', 'constant', 'pascal'] as Transformations.TypeName[],
        description: 'Case conversion for type names',
        default: 'pascal' as Transformations.TypeName,
        group: 'Code style options',
      },
    })
    .version(false)

export const handler = async (argv: Arguments<GenerateParams>) => {
  try {
    const file: number =
      argv.output === '-'
        ? 1 // STDOUT
        : await openAsync(argv.output, 'w')

    const dbUrl = argv['config-database'] || argv.database

    if (!dbUrl) {
      throw new TypeError(
        'Database URL not provided. Did you set the DATABASE_URL environment variable?'
      )
    }

    const schemaInfo = new SchemaInfo(
      createPool(dbUrl),
      argv['config-schema'] || argv.schema
    )

    const generator = new Generator({
      schema: schemaInfo,
      genEnums: argv.genEnums,
      genTables: argv.genTables,
      genInsertTypes: argv.genInsertTypes,
      genTypeObjects: argv.genTypeObjects,
      transformColumns: argv.transformColumns,
      transformEnumMembers: argv.transformEnumMembers,
      transformTypeNames: argv.transformTypeNames,
    })

    const result = await generator.build()

    await generator.destroy()

    await writeAsync(file, result)
    await closeAsync(file)
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }

    process.exit(1)
  }
}
