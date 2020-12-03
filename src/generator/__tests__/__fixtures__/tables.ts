import { TableInfo } from '../../database'

const mockTables: TableInfo[] = [
  {
    name: 'table_with_no_columns',
    canInsert: true,
    columns: [],
  },
  {
    name: 'table_with_numeric_id',
    canInsert: true,
    columns: [
      {
        name: 'id',
        hasDefault: true,
        isArray: false,
        nullable: false,
        order: 1,
        type: 'int8',
      },
    ],
  },
  {
    name: 'table_with_custom_types',
    canInsert: true,
    columns: [
      {
        name: 'enum_type',
        hasDefault: false,
        isArray: false,
        nullable: false,
        order: 1,
        type: 'test_enum',
      },
      {
        name: 'enum_array_type',
        hasDefault: false,
        isArray: true,
        nullable: false,
        order: 2,
        type: 'test_enum',
      },
      {
        name: 'table_type',
        hasDefault: false,
        isArray: false,
        nullable: false,
        order: 3,
        type: 'table_with_uuid_id',
      },
      {
        name: 'table_array_type',
        hasDefault: false,
        isArray: true,
        nullable: false,
        order: 4,
        type: 'table_with_uuid_id',
      },
    ],
  },
  {
    name: 'table_with_uuid_id',
    canInsert: true,
    columns: [
      {
        name: 'id',
        hasDefault: true,
        isArray: false,
        nullable: false,
        order: 1,
        type: 'uuid',
      },
    ],
  },
  {
    name: 'table_with_nullable_fields',
    canInsert: true,
    columns: [
      {
        name: 'nullable',
        hasDefault: false,
        isArray: false,
        nullable: true,
        order: 1,
        type: 'text',
      },
      {
        name: 'nullable_with_default',
        hasDefault: true,
        isArray: false,
        nullable: true,
        order: 2,
        type: 'text',
      },
      {
        name: 'nullable_array',
        hasDefault: false,
        isArray: true,
        nullable: true,
        order: 3,
        type: 'text',
      },
      {
        name: 'nullable_array_with_default',
        hasDefault: true,
        isArray: true,
        nullable: true,
        order: 4,
        type: 'text',
      },
    ],
  },
]

export default mockTables
