import postgres from "postgres";
import { PostgresJSDialect } from "kysely-postgres-js";
import { Kysely } from "kysely";
import { FileMigrationProvider, type MigrationResultSet, Migrator } from "kysely/migration";
import type { DatabaseSchema } from "./database/database-schema.ts";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const database = new Kysely<DatabaseSchema>({
  dialect: new PostgresJSDialect({
    postgres: postgres({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      database: process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    }),
  }),
});

const migrator = new Migrator({
  db: database,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.resolve(import.meta.dirname, "./database/migrations"),
  }),
});

const MIGRATION_TYPES = ["latest", "up", "down"] as const;
const migrationTypeSchema = z.enum(MIGRATION_TYPES);
type MigrationType = z.infer<typeof migrationTypeSchema>;

async function main() {
  let migrationType: MigrationType;
  try {
    migrationType = migrationTypeSchema.parse(process.argv[2]);
  } catch (error) {
    console.error({ error }, "Migration direction must be one of: latest, up, down");
    throw error;
  }

  let results: MigrationResultSet;
  switch (migrationType) {
    case "latest":
      results = await migrator.migrateToLatest();
      break;
    case "up":
      results = await migrator.migrateUp();
      break;
    case "down":
      results = await migrator.migrateDown();
      break;
  }

  for (const result of results.results ?? []) {
    console.info(
      { migration: result.migrationName, status: result.status },
      "Database migration finished",
    );
  }

  if (results.error) {
    console.error({ err: results.error }, "Database migration failed");
    process.exitCode = 1;
  }

  await database.destroy();
}

await main();
