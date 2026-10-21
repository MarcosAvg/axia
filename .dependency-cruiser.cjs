/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Sin dependencias circulares.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-feature-internals',
      severity: 'error',
      comment:
        'Un feature solo importa el index.ts público de otro feature (sección 4).',
      from: { path: '^apps/web/src/features/([^/]+)/.+' },
      to: {
        path: '^apps/web/src/features/[^/]+/.+',
        pathNot: [
          '^apps/web/src/features/$1/.+',
          '^apps/web/src/features/[^/]+/index\\.tsx?$',
        ],
      },
    },
    {
      name: 'no-components-lib-to-features',
      severity: 'error',
      comment:
        'components/ y lib/ no importan de features/ ni de routes/ (sección 4).',
      from: { path: '^apps/web/src/(components|lib)/' },
      to: { path: '^apps/web/src/(features|routes)/' },
    },
    {
      name: 'pure-domain',
      severity: 'error',
      comment:
        'domain/ es TypeScript puro: no React, TanStack, cliente HTTP ni Dexie (sección 4).',
      from: { path: '/domain/' },
      to: {
        path: '(^react$|^react-dom$|^@tanstack/|^dexie$|^@/lib/api-client$|^@/lib/offline/|node_modules/(react|react-dom|@tanstack|dexie)/)',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
  },
}
