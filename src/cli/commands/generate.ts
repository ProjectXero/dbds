import { close, open, write } from 'fs';
import { promisify } from 'util';
import { Arguments, Argv, BuilderCallback } from 'yargs';
import { Generator } from '../..';

import { Params } from '../';

const openAsync = promisify(open)
const closeAsync = promisify(close)
const writeAsync = promisify(write)

export const command: string = 'generate';
export const aliases: string[] = ['g', 'gen'];
export const desc: string = 'Generate types for the database';

export interface GenerateParams extends Params {
  output: string
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
      }
    })
    .version(false);

export const handler = async (argv: Arguments<GenerateParams>) => {
  try {
    const file: number = argv.output === '-'
      ? 1 // STDOUT
      : await openAsync(argv.output, 'w')

    const generator = new Generator({
      dbUrl: argv.database,
      newline: argv.newline,
      schema: argv.schema
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
