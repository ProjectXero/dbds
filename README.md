# pg-typegen

A simple CLI utility for generating TypeScript types for a PostgreSQL database.

## Table of Contents

* [Background](#background)
* [Install](#install)
  * [Dependencies](#dependencies)
* [Usage](#usage)
  * [CLI](#cli)
* [Contributing](#contributing)
* [License](#license)

## Background

Various options exist for generating TypeScript types for PostgreSQL databases,
but many of them are unmaintained, have outdated/obsolete dependencies, or otherwise
did not meet the requirements for the projects I'm working on. Here is some prior
art that inspired various features in pg-typegen.

* [schemats](https://github.com/SweetIQ/schemats)
* [database-types](https://github.com/gajus/database-types)
* [sq-reflect](https://github.com/harryparkdotio/sq-reflect)

## Install

Using [npm](https://npmjs.com/):

```bash
npm install --global pg-typegen
```

Using [yarn](https://yarnpkg.com/):

```bash
yarn global add pg-typegen
```

### Dependencies

* `node-config` - must be installed for the `--config-`-prefixed CLI options to
  function

## Usage

The `Generator` class allows you to use pg-typegen programmatically:

```tyepscript
const generator = new Generator({
  dbUrl: 'postgres:///',
  schema: 'public',
})
```

Options supported by `Generator` are included in the `GeneratorOptions` interface:

```typescript
export interface GeneratorOptions {
  dbUrl: string
  schema: string
  newline?: 'lf' | 'crlf'
  genEnums?: boolean
  genInsertTypes?: boolean
  genTables?: boolean
}
```

### CLI

pg-typegen is intended for use via the CLI.

```bash
$ pg-typegen --help
pg-typegen <command>

Commands:
  pg-typegen generate  Generate types for the database         [aliases: g, gen]

Options:
      --version          Show version number                           [boolean]
  -D, --database         Database connection URL, e.g. postgres:///dbname
                                                [string] [default: DATABASE_URL]
  -S, --schema           Name of the target schema in the database
                                                    [string] [default: "public"]
      --config-schema    Name of the config key containing the schema name
                         (requires node-config)                         [string]
      --config-database  Name of the config key containing the database url
                         (requires node-config)                         [string]
      --help             Show help                                     [boolean]
```

You will normally want to call the `pg-typegen generate` command. It is currently
the only supported command.

```bash
$ pg-typegen generate --help
Usage: pg-typegen generate

Generation options
  -o, --output            Destination filename for generated types
                                                      [string] [default: STDOUT]
      --gen-tables        Generate table types         [boolean] [default: true]
      --gen-enums         Generate enum types          [boolean] [default: true]
      --gen-insert-types  Generate table insert types  [boolean] [default: true]
  -N, --newline           Type of newline to use
                                         [choices: "lf", "crlf"] [default: "lf"]

Options:
  -D, --database         Database connection URL, e.g. postgres:///dbname
                                                [string] [default: DATABASE_URL]
  -S, --schema           Name of the target schema in the database
                                                    [string] [default: "public"]
      --config-schema    Name of the config key containing the schema name
                         (requires node-config)                         [string]
      --config-database  Name of the config key containing the database url
                         (requires node-config)                         [string]
      --help             Show help                                     [boolean]
```

## Contributing

Pull requests, questions, and bug reports are gladly accepted!

## License

MIT License
