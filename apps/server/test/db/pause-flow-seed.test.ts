import { Client } from 'pg'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let owner: Client

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
})

it('separa los pasos de avance de las salidas', async () => {
  expect(
    await scalar(`
        select count(*)::text as value
        from public.reasons
        where use = 'pause' and parent_id is not null
          and pause_step_kind is null
      `),
  ).toBe(0)
  expect(
    await scalar(`
        select count(*)::text as value
        from public.reasons
        where use = 'pause' and parent_id is null
          and pause_step_kind is not null
      `),
  ).toBe(0)
  expect(
    await scalar(`
        select count(*)::text as value
        from public.reasons
        where use = 'pause' and parent_id is not null
          and pause_step_kind = 'exit'
          and active
      `),
  ).toBe(22)
})

it('limita los motivos predefinidos a dos pasos de avance', async () => {
  const result = await owner.query<{ name: string; steps: number }>(`
    select root.name, count(step.id)::int as steps
    from public.reasons root
    join public.reasons step
      on step.parent_id = root.id
      and step.use = 'pause'
      and step.pause_step_kind = 'progress'
      and step.active
    where root.use = 'pause' and root.parent_id is null and root.active
    group by root.id, root.name
    having count(step.id) > 2
    order by root.name
  `)
  expect(result.rows).toEqual([])
})

it('ofrece salidas directas desde el motivo en la mayoría de los casos', async () => {
  expect(
    await scalar(`
      select count(*)::text as value
      from public.pause_transitions t
      join public.reasons source on source.id = t.from_reason_id
      join public.reasons target on target.id = t.to_reason_id
      where source.use = 'pause' and source.parent_id is null
        and source.active and target.active
        and target.pause_step_kind = 'exit'
    `),
  ).toBe(15)
})

it('no deja pasos de avance sin una arista de salida', async () => {
  expect(
    await scalar(`
        select count(*)::text as value
        from public.reasons step
        where step.use = 'pause'
          and step.parent_id is not null
          and step.pause_step_kind = 'progress'
          and step.active
          and not exists (
            select 1
            from public.pause_transitions t
            where t.from_reason_id = step.id
          )
      `),
  ).toBe(0)
})

it('permite reanudar en cada motivo con una salida alcanzable', async () => {
  const result = await owner.query<{ name: string }>(`
      with recursive reachable(root_id, node_id) as (
        select r.id, r.id
        from public.reasons r
        where r.use = 'pause' and r.parent_id is null and r.active
        union
        select reachable.root_id, t.to_reason_id
        from reachable
        join public.pause_transitions t on t.from_reason_id = reachable.node_id
      )
      select root.name
      from public.reasons root
      where root.use = 'pause' and root.parent_id is null and root.active
        and not exists (
          select 1
          from reachable
          join public.reasons exit on exit.id = reachable.node_id
          where reachable.root_id = root.id
            and exit.pause_step_kind = 'exit'
            and exit.active
        )
      order by root.name
    `)
  expect(result.rows).toEqual([])
})

it('no permite que una salida tenga aristas de salida', async () => {
  expect(
    await scalar(`
        select count(*)::text as value
        from public.pause_transitions t
        join public.reasons source on source.id = t.from_reason_id
        where source.pause_step_kind = 'exit'
      `),
  ).toBe(0)
})

it('mantiene el flujo sin ciclos', async () => {
  expect(
    await scalar(`
        with recursive paths(from_id, to_id) as (
          select from_reason_id, to_reason_id from public.pause_transitions
          union
          select paths.from_id, t.to_reason_id
          from paths
          join public.pause_transitions t on t.from_reason_id = paths.to_id
        )
        select count(*)::text as value
        from paths
        where from_id = to_id
      `),
  ).toBe(0)
})
