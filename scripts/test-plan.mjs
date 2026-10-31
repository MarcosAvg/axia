function isDocumentation(file) {
  return (
    !file.startsWith('.github/') &&
    (file.startsWith('docs/') || file.endsWith('.md'))
  )
}

function appPath(file, app) {
  return file.startsWith(`apps/${app}/`)
    ? file.slice(`apps/${app}/`.length)
    : null
}

function isStructural(file) {
  return (
    [
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'tsconfig.base.json',
      'knip.json',
      'lint-staged.config.mjs',
      'apps/web/package.json',
      'apps/server/package.json',
    ].includes(file) ||
    /(^|\/)(?:docker-)?compose(?:[.-][^/]*)?\.ya?ml$/.test(file) ||
    /(^|\/)Dockerfile(?:\.[^/]*)?$/.test(file) ||
    file.endsWith('.dockerignore') ||
    /(^|\/)\.env(?:\.[^/]*)?\.(?:example|template)$/.test(file) ||
    /(?:vitest|playwright|playwright\.visual)\.config\.ts$/.test(file) ||
    ['deploy/', 'scripts/', '.github/'].some((prefix) =>
      file.startsWith(prefix),
    )
  )
}

function isRecognized(file) {
  return (
    isDocumentation(file) ||
    (/\.(ts|tsx)$/.test(file) &&
      (appPath(file, 'server') || appPath(file, 'web'))) ||
    appPath(file, 'server')?.startsWith('db/migrations/') ||
    (appPath(file, 'web') && /\.(css|scss)$/.test(file))
  )
}

function relatedCommand(app, files) {
  return [
    'pnpm',
    '--filter',
    `@axia/${app}`,
    'exec',
    'vitest',
    'related',
    '--run',
    ...files,
  ]
}

function serverCommands(files) {
  const serverPaths = files
    .map((file) => appPath(file, 'server'))
    .filter(Boolean)
  const migration = serverPaths.some(
    (file) => file.startsWith('db/migrations/') || file.startsWith('src/db/'),
  )
  if (migration)
    return [
      ['pnpm', '--filter', '@axia/server', 'test'],
      ['pnpm', 'db:test'],
    ]
  const unitFiles = serverPaths.filter((file) => /\.(ts|tsx)$/.test(file))
  return unitFiles.length > 0 ? [relatedCommand('server', unitFiles)] : []
}

function isWebUi(file) {
  return (
    !file.includes('.test.') &&
    (/\.(css|scss)$/.test(file) ||
      ['src/routes/', 'src/components/', 'src/app/'].some((prefix) =>
        file.startsWith(prefix),
      ) ||
      /^src\/features\/[^/]+\/components\//.test(file))
  )
}

function webCommands(files) {
  const webPaths = files.map((file) => appPath(file, 'web')).filter(Boolean)
  const webFiles = webPaths.filter((file) => /\.(ts|tsx)$/.test(file))
  const unitFiles = webFiles.filter((file) => !file.startsWith('e2e/'))
  const e2eSpecs = webFiles.filter((file) => file.startsWith('e2e/'))
  const commands = []
  if (unitFiles.length > 0) commands.push(relatedCommand('web', unitFiles))
  if (e2eSpecs.length > 0) {
    commands.push([
      'pnpm',
      '--filter',
      '@axia/web',
      'exec',
      'playwright',
      'test',
      ...e2eSpecs,
    ])
  } else if (webPaths.some(isWebUi)) {
    commands.push(['pnpm', 'test:e2e:smoke'])
  }
  return commands
}

// Solo clasifica rutas: no lee Git, entorno ni archivos y no ejecuta procesos.
export function planAffectedTests({
  files,
  deletedFiles = [],
  discoveryFailed = false,
}) {
  const fullCheck = [['pnpm', 'check']]
  if (discoveryFailed || deletedFiles.some((file) => !isDocumentation(file)))
    return fullCheck
  const uniqueFiles = [...new Set(files)]
  if (uniqueFiles.length === 0) return []
  if (uniqueFiles.some(isStructural)) return fullCheck
  if (uniqueFiles.every(isDocumentation)) return [['pnpm', 'check:docs']]
  if (!uniqueFiles.every(isRecognized)) return fullCheck
  const commands = [...serverCommands(uniqueFiles), ...webCommands(uniqueFiles)]
  return commands.length > 0 ? commands : fullCheck
}
