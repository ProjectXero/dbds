import type { IConfig } from 'config'
import yargs from 'yargs'

const getConfig = (key: string): string | undefined => {
  const originalEnv = process.env.SUPPRESS_NO_CONFIG_WARNING
  process.env.SUPPRESS_NO_CONFIG_WARNING = '1'

  try {
    const config: IConfig = require('config')
    if (config.has(key)) {
      return config.get(key)
    }
  } catch (error: any) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
      throw error
    }
  } finally {
    process.env.SUPPRESS_NO_CONFIG_WARNING = originalEnv
  }

  return undefined
}

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
    schema: {
      alias: 'S',
      requiresArg: true,
      type: 'string',
      description: 'Name of the target schema in the database',
      default: 'public',
    },
    'config-schema': {
      requiresArg: true,
      type: 'string',
      description:
        'Name of the config key containing the schema name (requires node-config)',
    },
    'config-database': {
      requiresArg: true,
      type: 'string',
      description:
        'Name of the config key containing the database url (requires node-config)',
    },
  })
  .coerce(['config-schema', 'config-database'], getConfig)
  .help()
  .commandDir('commands')
  .demandCommand()
  .strict()

export type Params = typeof program.argv

program.argv
