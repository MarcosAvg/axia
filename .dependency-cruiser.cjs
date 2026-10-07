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
      name: 'no-core-to-integrations',
      severity: 'error',
      comment: 'El núcleo no importa de features/integrations/ (sección 4).',
      from: { pathNot: '^apps/web/src/features/integrations/' },
      to: { path: '^apps/web/src/features/integrations/' },
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
      name: 'only-api-lib-import-supabase',
      severity: 'error',
      comment:
        'El cliente de Supabase solo se importa desde features/*/api o lib/ (sección 4).',
      from: { pathNot: '^apps/web/src/(features/[^/]+/api|lib)/' },
      to: {
        path: '(^@supabase/supabase-js$|node_modules/@supabase/supabase-js/)',
      },
    },
    {
      name: 'pure-domain',
      severity: 'error',
      comment:
        'domain/ es TypeScript puro: no React, TanStack, Supabase ni Dexie (sección 4).',
      from: { path: '/domain/' },
      to: {
        path: '(^react$|^react-dom$|^@tanstack/|^@supabase/|^dexie$|node_modules/(react|react-dom|@tanstack|@supabase|dexie)/)',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
  },
}
