import globalTeardown from '@databases/pg-test/jest/globalTeardown'

module.exports = async () => {
  await globalTeardown()
}
