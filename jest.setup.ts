import globalSetup from '@databases/pg-test/jest/globalSetup'

export default async (): Promise<void> => {
  await globalSetup({
    image: 'postgres',
  })
}
