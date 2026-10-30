import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

/** Una dependencia con vínculos solo se acepta en sus ubicaciones; sin vínculos, en todas. */
export async function assertRecapturePair(
  tx: DbExecutor,
  input: {
    current: { dependencyId: string; locationId: string }
    changes: {
      buildingId?: string
      locationId?: string
      dependencyId?: string
    }
  },
) {
  const { changes, current } = input
  if (
    changes.buildingId === undefined &&
    changes.locationId === undefined &&
    changes.dependencyId === undefined
  ) {
    return
  }
  await assertPair(
    tx,
    changes.dependencyId ?? current.dependencyId,
    changes.locationId ?? current.locationId,
  )
}

export async function assertPair(
  tx: DbExecutor,
  dependencyId: string,
  locationId: string,
) {
  const result = await tx.execute(sql`
    select
      exists (
        select 1 from public.dependency_locations
        where dependency_id = ${dependencyId}
      ) as linked,
      exists (
        select 1 from public.dependency_locations
        where dependency_id = ${dependencyId} and location_id = ${locationId}
      ) as matches
  `)
  const row = result.rows[0] as
    { linked: boolean; matches: boolean } | undefined
  if (row?.linked && !row.matches) {
    throw new AppError(
      400,
      'validation_error',
      'La dependencia no está disponible en la ubicación',
    )
  }
}
