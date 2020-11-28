import { close, open, write } from 'fs'
import { promisify } from 'util'
import { Arguments, Argv, BuilderCallback } from 'yargs'

import { Generator, GeneratorOptions } from '../..'

import { Params } from '../'
import { createPool } from 'slonik'
import { SchemaInfo } from '../../generator/database'

const openAsync = promisify(open)
const closeAsync = promisify(close)
const writeAsync = promisify(write)

export const command: string = 'generate'
export const aliases: string[] = ['g', 'gen']
export const desc: string = 'Generate types for the database'

export interface GenerateParams extends Params {
  output: string
  genEnums: boolean
  genInsertTypes: boolean
  genTables: boolean
  newline: Required<GeneratorOptions>['newline']
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
      newline: {
        alias: 'N',
        requiresArg: true,
        choices: ['lf', 'crlf'] as ReadonlyArray<GeneratorOptions['newline']>,
        description: "Type of newline to use",
        default: 'lf' as GeneratorOptions['newline'],
        group: 'Generation options',
      },
    })
    .version(false)

export const handler = async (argv: Arguments<GenerateParams>) => {
  try {
    const file: number = argv.output === '-'
      ? 1 // STDOUT
      : await openAsync(argv.output, 'w')

    const dbUrl = argv["config-database"] || argv.database

    if (!dbUrl) {
      throw new TypeError('Database URL not provided. Did you set the DATABASE_URL environment variable?')
    }

    const schemaInfo = new SchemaInfo(createPool(dbUrl), argv["config-schema"] || argv.schema)

    const generator = new Generator({
      schema: schemaInfo,
      newline: argv.newline,
      genEnums: argv.genEnums,
      genTables: argv.genTables,
      genInsertTypes: argv.genInsertTypes,
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
