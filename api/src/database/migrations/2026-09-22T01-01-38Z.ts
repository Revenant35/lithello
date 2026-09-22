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
    .addColumn("emailVerified", "boolean", (column) => column.notNull())
    .addColumn("image", "text")
    .addColumn("createdAt", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updatedAt", "timestamptz", (column) =>
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
    .addColumn("expiresAt", "timestamptz", (column) => column.notNull())
    .addColumn("token", "text", (column) => column.notNull().unique())
    .addColumn("createdAt", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updatedAt", "timestamptz", (column) => column.notNull())
    .addColumn("ipAddress", "text")
    .addColumn("userAgent", "text")
    .addColumn("userId", "uuid", (column) =>
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
    .addColumn("accountId", "text", (column) => column.notNull())
    .addColumn("providerId", "text", (column) => column.notNull())
    .addColumn("userId", "uuid", (column) =>
      column.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("accessToken", "text")
    .addColumn("refreshToken", "text")
    .addColumn("idToken", "text")
    .addColumn("accessTokenExpiresAt", "timestamptz")
    .addColumn("refreshTokenExpiresAt", "timestamptz")
    .addColumn("scope", "text")
    .addColumn("password", "text")
    .addColumn("createdAt", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updatedAt", "timestamptz", (column) => column.notNull())
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
    .addColumn("expiresAt", "timestamptz", (column) => column.notNull())
    .addColumn("createdAt", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updatedAt", "timestamptz", (column) =>
      column.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  await database.schema.createIndex("session_userId_idx").on("session").column("userId").execute();

  await database.schema.createIndex("account_userId_idx").on("account").column("userId").execute();

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
