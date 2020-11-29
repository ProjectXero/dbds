module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/npm',
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: 'CHANGELOG.md',
      }
    ],
  ],
}
