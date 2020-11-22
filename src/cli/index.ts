import yargs from 'yargs'

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
    }
  })
  .help()
  .commandDir('commands')
  .demandCommand()
  .strict()

export type Params = typeof program.argv

program.argv
