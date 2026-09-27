import { type Kysely, sql } from "kysely";

export async function up(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .alterTable("game_action")
    .alterColumn("clock_ms_remaining", (col) => col.dropNotNull())
    .execute();

  await database.schema
    .alterTable("game_action")
    .addCheckConstraint(
      "game_action_clock_ms_remaining_present",
      sql`kind <> 'move' or clock_ms_remaining is not null`,
    )
    .execute();
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .alterTable("game_action")
    .dropConstraint("game_action_clock_ms_remaining_present")
    .execute();

  await database.schema
    .alterTable("game_action")
    .alterColumn("clock_ms_remaining", (col) => col.setNotNull())
    .execute();
}
