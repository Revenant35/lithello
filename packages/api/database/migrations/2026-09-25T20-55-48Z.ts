import { type Kysely, sql } from "kysely";

export async function up(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .createTable("user")
    .addColumn("id", "uuid", (column) =>
      column
        .defaultTo(sql`pg_catalog.gen_random_uuid()`)
        .notNull()
        .primaryKey(),
    )
    .addColumn("name", "text", (column) => column.notNull())
    .addColumn("email", "text", (column) => column.notNull().unique())
    .addColumn("email_verified", "boolean", (column) => column.notNull())
    .addColumn("image", "text")
    .addColumn("created_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  await database.schema
    .createTable("session")
    .addColumn("id", "uuid", (column) =>
      column
        .defaultTo(sql`pg_catalog.gen_random_uuid()`)
        .notNull()
        .primaryKey(),
    )
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("token", "text", (column) => column.notNull().unique())
    .addColumn("created_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (column) => column.notNull())
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("user.id").onDelete("cascade"),
    )
    .execute();

  await database.schema
    .createTable("account")
    .addColumn("id", "uuid", (column) =>
      column
        .defaultTo(sql`pg_catalog.gen_random_uuid()`)
        .notNull()
        .primaryKey(),
    )
    .addColumn("account_id", "text", (column) => column.notNull())
    .addColumn("provider_id", "text", (column) => column.notNull())
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("access_token", "text")
    .addColumn("refresh_token", "text")
    .addColumn("id_token", "text")
    .addColumn("access_token_expires_at", "timestamptz")
    .addColumn("refresh_token_expires_at", "timestamptz")
    .addColumn("scope", "text")
    .addColumn("password", "text")
    .addColumn("created_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (column) => column.notNull())
    .execute();

  await database.schema
    .createTable("verification")
    .addColumn("id", "uuid", (column) =>
      column
        .defaultTo(sql`pg_catalog.gen_random_uuid()`)
        .notNull()
        .primaryKey(),
    )
    .addColumn("identifier", "text", (column) => column.notNull())
    .addColumn("value", "text", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  await database.schema.createIndex("session_user_id_idx").on("session").column("user_id").execute();

  await database.schema.createIndex("account_user_id_idx").on("account").column("user_id").execute();

  await database.schema
    .createIndex("verification_identifier_idx")
    .on("verification")
    .column("identifier")
    .execute();
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema.dropTable("verification").execute();
  await database.schema.dropTable("account").execute();
  await database.schema.dropTable("session").execute();
  await database.schema.dropTable("user").execute();
}
