import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The better-auth schema generator emits `timestamp("x")`, which is Postgres
 * `timestamp without time zone`. That stores whatever wall-clock the session
 * timezone implies, so the same instant written under two different session
 * timezones lands as two different values - and session expiry comparisons
 * drift by the UTC offset. Every other table in this schema uses timestamptz.
 *
 * There is no generator option for this, so we rewrite the file after
 * generation. Run automatically by `pnpm db:auth-generate`.
 */
const target = path.resolve(
  import.meta.dirname,
  '../src/database/schema/auth.schema.ts',
);

const source = readFileSync(target, 'utf8');

let patched = 0;
const output = source.replace(/timestamp\("([^"]+)"\)/g, (_match, column: string) => {
  patched += 1;
  return `timestamp("${column}", { withTimezone: true })`;
});

const alreadyPatched = (source.match(/withTimezone: true/g) ?? []).length;

if (patched === 0 && alreadyPatched === 0) {
  throw new Error(
    `No timestamp columns found in ${target}. The better-auth generator output ` +
      `format has probably changed - check whether this patch is still needed.`,
  );
}

if (patched > 0) {
  writeFileSync(target, output);
}

console.info(
  `auth.schema.ts: ${patched} timestamp column(s) converted to timestamptz` +
    (alreadyPatched > 0 ? ` (${alreadyPatched} already converted)` : ''),
);
