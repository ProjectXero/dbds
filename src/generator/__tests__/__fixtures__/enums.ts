import { z } from 'zod'
import { EnumInfo } from '../../database'

const mockEnums: z.infer<typeof EnumInfo>[] = [
  { name: 'test_enum', values: ['A', 'b', 'camel_case_rules'] },
]

export default mockEnums
