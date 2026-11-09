// Build a deployment-only bundle. Private environment files are never inputs.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const repository = process.env.GITHUB_REPOSITORY ?? 'MarcosAvg/axia'
const [outputArg, image, revision, version] = process.argv.slice(2)
if (
  !outputArg ||
  !/^[a-z0-9][a-z0-9./:_-]*(?:@sha256:[a-f0-9]{64}|:[a-f0-9]{40}|:v\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?)$/.test(
    image ?? '',
  )
) {
  throw new Error(
    'Usage: package-release.mjs OUTPUT IMMUTABLE_IMAGE REVISION VERSION; select an immutable release image',
  )
}
if (
  !/^[a-f0-9]{40}$/.test(revision ?? '') ||
  !/^(?:v\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?|[a-f0-9]{40})$/.test(version ?? '')
) {
  throw new Error('A full commit revision and release version are required')
}
const output = resolve(outputArg)
if (existsSync(output))
  throw new Error('Output already exists; choose a new directory')
mkdirSync(output, { recursive: true })
for (const file of ['compose.yaml', 'LICENSE'])
  cpSync(join(root, file), join(output, file))
mkdirSync(join(output, 'deploy/scripts'), { recursive: true })
for (const name of readdirSync(join(root, 'deploy/scripts'))) {
  if (name.endsWith('.sh') && !name.includes('.test.')) {
    cpSync(
      join(root, 'deploy/scripts', name),
      join(output, 'deploy/scripts', name),
    )
  }
}
const env = readFileSync(join(root, '.env.example'), 'utf8').replace(
  /^# AXIA_IMAGE=.*$/m,
  () =>
    `# Opcional: fija esta release exacta. Por defecto se usa :latest.\n# AXIA_IMAGE=${image}`,
)
writeFileSync(join(output, '.env.example'), env)
writeFileSync(
  join(output, 'release.json'),
  `${JSON.stringify({ version, revision, image }, null, 2)}\n`,
)

function operatorDocument(source, destination) {
  const sourcePath = join(root, source)
  const content = readFileSync(sourcePath, 'utf8').replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, label, target) => {
      if (/^(https?:|mailto:|#)/.test(target)) return match
      const resolved = relative(root, resolve(dirname(sourcePath), target))
      if (resolved === 'docs/guides/operacion.md')
        return `[${label}](OPERATIONS.md)`
      const url = `https://github.com/${repository}/blob/${revision}/${resolved}`
      return `[${label}](${url})`
    },
  )
  writeFileSync(join(output, destination), content)
}
operatorDocument('deploy/README.md', 'README.md')
operatorDocument('docs/guides/operacion.md', 'OPERATIONS.md')
process.stdout.write(`Deployment bundle created: ${output}\n`)
