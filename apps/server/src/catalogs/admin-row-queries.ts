import { sql, type SQL } from 'drizzle-orm'

import type { AdminCatalogTable } from './admin.js'

export const SELECTS: Record<AdminCatalogTable, SQL> = {
  teams: sql`
    select
      t.id,
      t.name,
      t.active,
      t.work_calendar_id,
      t.updated_at,
      (select count(*)::int from public.technicians x
        where x.team_id = t.id) as technicians_count,
      (select count(*)::int from public.problems p
        where p.team_id = t.id) as problems_count
    from public.teams t
  `,
  buildings: sql`
    select
      b.id,
      b.name,
      b.active,
      b.updated_at,
      (select count(*)::int from public.locations l
        where l.building_id = b.id) as locations_count,
      (select count(distinct dl.dependency_id)::int
        from public.dependency_locations dl
        join public.locations l on l.id = dl.location_id
        where l.building_id = b.id) as dependencies_count
    from public.buildings b
  `,
  locations: sql`
    select
      l.id,
      l.name,
      l.active,
      l.building_id,
      l.updated_at,
      (select count(distinct dl.dependency_id)::int
        from public.dependency_locations dl
        where dl.location_id = l.id) as dependencies_count
    from public.locations l
  `,
  dependencies: sql`
    select
      d.id,
      d.name,
      d.active,
      d.updated_at,
      (select count(*)::int from public.dependency_locations dl
        where dl.dependency_id = d.id) as locations_count,
      (select count(distinct l.building_id)::int
        from public.dependency_locations dl
        join public.locations l on l.id = dl.location_id
        where dl.dependency_id = d.id) as buildings_count,
      coalesce((
        select string_agg(name, ', ' order by public.natural_sort_key(name))
        from (
          select distinct b.name
          from public.dependency_locations dl
          join public.locations l on l.id = dl.location_id
          join public.buildings b on b.id = l.building_id
          where dl.dependency_id = d.id
        ) names
      ), '') as building_names
    from public.dependencies d
  `,
  categories: sql`
    select
      c.id,
      c.name,
      c.active,
      c.updated_at,
      (select count(*)::int from public.subcategories s
        where s.category_id = c.id) as subcategories_count,
      (select count(*)::int
        from public.problems p
        join public.subcategories s on s.id = p.subcategory_id
        where s.category_id = c.id) as problems_count
    from public.categories c
  `,
  subcategories: sql`
    select
      s.id,
      s.name,
      s.active,
      s.category_id,
      s.updated_at,
      (select count(*)::int from public.problems p
        where p.subcategory_id = s.id) as problems_count
    from public.subcategories s
  `,
  problems: sql`
    select
      p.id,
      p.name,
      p.active,
      p.subcategory_id,
      p.team_id,
      p.default_priority_id,
      p.attachment_required_types,
      p.attachment_instructions,
      p.updated_at,
      s.category_id,
      c.name as category_name
    from public.problems p
    join public.subcategories s on s.id = p.subcategory_id
    join public.categories c on c.id = s.category_id
  `,
  service_types: sql`
    select
      st.id,
      st.name,
      st.active,
      st.target_minutes,
      st.updated_at
    from public.service_types st
  `,
  priorities: sql`
    select
      pr.id,
      pr.name,
      pr.active,
      pr.position,
      pr.target_minutes,
      pr.updated_at
    from public.priorities pr
  `,
  channels: sql`
    select
      ch.id,
      ch.name,
      ch.active,
      ch.is_platform,
      ch.updated_at
    from public.channels ch
  `,
  requesters: sql`
    select
      r.id,
      r.full_name,
      r.contact,
      r.dependency_id,
      r.user_id,
      r.active,
      r.updated_at,
      u.username as user_label,
      u.active as user_active
    from public.requesters r
    left join public.users u on u.id = r.user_id
  `,
  technicians: sql`
    select
      t.id,
      t.full_name,
      t.team_id,
      t.user_id,
      t.active,
      t.updated_at,
      u.username as user_label,
      u.active as user_active,
      (select count(*)::int from public.technician_categories tc
        where tc.technician_id = t.id) as categories_count,
      coalesce((
        select string_agg(c.name, ', ' order by public.natural_sort_key(c.name))
        from public.technician_categories tc
        join public.categories c on c.id = tc.category_id
        where tc.technician_id = t.id
      ), '') as category_names
    from public.technicians t
    left join public.users u on u.id = t.user_id
  `,
  reasons: sql`
    select
      r.id,
      r.use,
      r.parent_id,
      r.name,
      r.position,
      r.requires_note,
      r.allows_estimated_date,
      r.clock_class,
      r.active,
      r.pause_step_kind,
      r.updated_at,
      coalesce(tree.path, r.name) as path,
      coalesce(tree.depth, 1)::int as depth,
      (select count(*)::int from public.reasons k
        where k.parent_id = r.id) as children_count
    from public.reasons r
    left join (
      with recursive walk as (
        select id, name::text as path, 1 as depth
        from public.reasons
        where parent_id is null
        union all
        select child.id, walk.path || ' › ' || child.name, walk.depth + 1
        from public.reasons child
        join walk on child.parent_id = walk.id
        where walk.depth < 20
      )
      select * from walk
    ) tree on tree.id = r.id
  `,
  work_calendars: sql`
    select
      wc.id,
      wc.name,
      wc.active,
      wc.timezone,
      wc.updated_at,
      (select count(*)::int from public.work_calendar_intervals i
        where i.calendar_id = wc.id) as intervals_count,
      (select count(*)::int from public.work_calendar_holidays h
        where h.calendar_id = wc.id) as holidays_count
    from public.work_calendars wc
  `,
}
