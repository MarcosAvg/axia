-- Runner metadata only. The runner also bootstraps this idempotent migration
-- before validating history, so existing installations can adopt fingerprints.
alter table axia_migrations.schema_migrations
  add column if not exists checksum text;
