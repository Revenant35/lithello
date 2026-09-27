import { type Kysely, sql } from "kysely";

const INITIAL_BOARD = `${"-".repeat(24)}---wb------bw---${"-".repeat(24)}`;

export async function up(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .alterTable("game")
    .addColumn("board", "char(64)", (col) =>
      col.notNull().defaultTo(sql.lit(INITIAL_BOARD)),
    )
    .execute();

  await database.schema
    .alterTable("game")
    .addCheckConstraint("game_board_valid", sql`board ~ '^[wb-]{64}$'`)
    .execute();

  await database.schema
    .alterTable("game")
    .alterColumn("status", (col) => col.setDefault("active"))
    .execute();
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .alterTable("game")
    .alterColumn("status", (col) => col.dropDefault())
    .execute();

  await database.schema
    .alterTable("game")
    .dropConstraint("game_board_valid")
    .execute();

  await database.schema.alterTable("game").dropColumn("board").execute();
}
