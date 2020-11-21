import { createPool, DatabasePoolConnectionType, sql } from "slonik"

const PUBLIC_SCHEMA = 'public'

export interface EnumInfo {
  name: string
  values: string[]
}

export interface ColumnInfo {
  name: string
  nullable: boolean
  hasDefault: boolean
  order: number
  type: string
  isArray: boolean
}

export interface TableInfo {
  name: string
  canInsert: boolean
  columns: readonly ColumnInfo[]
}


export default class SchemaInfo {
  private readonly pool: DatabasePoolConnectionType
  public readonly name: string

  constructor(dbUrl: string | undefined = process.env.DATABASE_URL, name: string = PUBLIC_SCHEMA) {
    if (!dbUrl) {
      throw new TypeError('Database URL not provided. Did you set the DATABASE_URL environment variable?')
    }

    this.pool = createPool(dbUrl)
    this.name = name
  }

  public async getTables(): Promise<readonly TableInfo[]> {
    const tables = await this.pool.any(sql<Omit<TableInfo, 'columns'>>`
      SELECT table_name AS "name"
           , (is_insertable_into = 'YES') AS "canInsert"
      FROM information_schema.tables
      WHERE table_schema = ${this.name}
    `)

    return Promise.all(
      tables.map<Promise<TableInfo>>(async (table) => {
        return {
          ...table,
          columns: await this.getTableColumns(table.name)
        }
      })
    )
  }

  public async getTableColumns(table: string): Promise<readonly ColumnInfo[]> {
    return await this.pool.many(sql<ColumnInfo>`
      SELECT c.column_name AS "name"
           , (c.is_nullable = 'YES') AS "nullable"
           , (c.column_default IS NULL) AS "hasDefault"
           , c.ordinal_position AS "order"
           , COALESCE(de.udt_name, dc.udt_name, e.data_type, c.udt_name, c.data_type) AS "type"
           , (c.data_type = 'ARRAY') AS "isArray"
      FROM
        information_schema.columns c LEFT JOIN
        information_schema.element_types e ON (
          c.data_type = 'ARRAY' AND
          c.table_schema = e.object_schema AND
          c.table_name = e.object_name AND
          c.dtd_identifier = e.collection_type_identifier
        ) LEFT JOIN
        information_schema.domains dc ON (
          c.data_type = 'USER-DEFINED' AND
          c.table_schema = dc.domain_schema AND
          c.domain_name = dc.domain_name
        ) LEFT JOIN
        information_schema.domains de ON (
          e.data_type = 'USER-DEFINED' AND
          e.object_schema = de.domain_schema AND
          e.udt_name = de.domain_name
        )
      WHERE (
        c.table_schema = ${this.name} AND
        c.table_name = ${table}
      )
      ORDER BY c.ordinal_position
    `)
  }

  public async getEnums(): Promise<readonly EnumInfo[]> {
    return await this.pool.any(sql<EnumInfo>`
      SELECT t.typname AS "name"
           , array_agg(e.enumlabel)::TEXT[] AS "values"
      FROM
        pg_type t JOIN
        pg_enum e ON (
          t.oid = e.enumtypid
        ) JOIN
        pg_catalog.pg_namespace n ON (
          n.oid = t.typnamespace
        )
      WHERE (
        n.nspname = ${this.name}
      )
      GROUP BY n.nspname
             , t.typname;
    `);
  }

}
