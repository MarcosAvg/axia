export default {
  '**/*.{js,mjs,cjs,jsx,json,css,yml,yaml}': 'prettier --write',
  '**/*.{ts,tsx}': (files) => {
    const webFiles = files.filter(
      (file) =>
        file.includes('/apps/web/') && !file.endsWith('routeTree.gen.ts'),
    )
    const otherFiles = files.filter((file) => !file.includes('/apps/web/'))

    const commands = []
    if (otherFiles.length > 0) {
      commands.push(`prettier --write ${otherFiles.join(' ')}`)
    }
    if (webFiles.length > 0) {
      commands.push(`prettier --write ${webFiles.join(' ')}`)
      commands.push(
        `pnpm --filter @axia/web exec eslint --fix --no-warn-ignored ${webFiles.join(' ')}`,
      )
    }
    return commands
  },
}
