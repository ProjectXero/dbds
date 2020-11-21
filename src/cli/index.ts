import yargs from 'yargs'

import { GeneratorOptions } from '..'

const program = yargs(process.argv.slice(2))
  .options({
    database: {
      alias: 'D',
      requiresArg: true,
      type: 'string',
      description: 'Database connection URL, e.g. postgres:///dbname',
      default: process.env.DATABASE_URL,
      defaultDescription: 'DATABASE_URL',
    },
    newline: {
      alias: 'N',
      requiresArg: true,
      choices: ['lf', 'crlf'] as ReadonlyArray<GeneratorOptions['newline']>,
      description: "Type of newline to use",
      default: 'lf' as GeneratorOptions['newline'],
    },
    schema: {
      alias: 'S',
      requiresArg: true,
      type: 'string',
      description: 'Name of the target schema in the database',
      default: 'public',
    }
  })
  .help()
  .commandDir('commands')
  .demandCommand()
  .strict()

export type Params = typeof program.argv

program.argv
