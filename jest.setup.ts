import globalSetup from '@databases/pg-test/jest/globalSetup'

export default async () => {
  await globalSetup({
    image: 'postgres',
  })
}
