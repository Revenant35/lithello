import { type Kysely, sql } from "kysely";

export async function up(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .createTable("game")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("white_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("black_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("start_clock_ms", "integer", (col) => col.notNull())
    .addColumn("status", "varchar(16)", (col) => col.notNull())
    .addColumn("result", "varchar(16)")
    .addColumn("end_reason", "varchar(16)")
    .addColumn("started_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("ended_at", "timestamptz")
    .addCheckConstraint("game_players_different", sql`white_id <> black_id`)
    .addCheckConstraint("game_status_valid", sql`status in ('active', 'finished')`)
    .addCheckConstraint(
      "game_result_valid",
      sql`result is null or result in ('white_win', 'black_win', 'draw')`,
    )
    .addCheckConstraint(
      "game_end_reason_valid",
      sql`end_reason is null or end_reason in ('normal', 'resignation', 'timeout')`,
    )
    .addCheckConstraint("game_start_clock_ms_valid", sql`start_clock_ms > 0`)
    .addCheckConstraint("game_result_finished", sql`status <> 'finished' or result is not null`)
    .addCheckConstraint(
      "game_end_reason_finished",
      sql`status <> 'finished' or end_reason is not null`,
    )
    .addCheckConstraint("game_ended_at_finished", sql`status = 'active' or ended_at is not null`)
    .execute();

  await database.schema.createIndex("game_white_id_idx").on("game").column("white_id").execute();

  await database.schema.createIndex("game_black_id_idx").on("game").column("black_id").execute();

  await database.schema
    .createTable("game_action")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("game_id", "uuid", (col) => col.references("game.id").onDelete("cascade").notNull())
    .addColumn("user_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("action_number", "smallint", (col) => col.notNull())
    .addColumn("kind", "varchar(4)", (col) => col.notNull())
    .addColumn("clock_ms_remaining", "integer", (col) => col.notNull())
    .addColumn("row", "smallint")
    .addColumn("col", "smallint")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("game_action_game_id_action_number_unique", ["game_id", "action_number"])
    .addCheckConstraint("game_action_kind_valid", sql`kind in ('move', 'pass')`)
    .addCheckConstraint("game_action_number_valid", sql`action_number between 1 and 256`)
    .addCheckConstraint(
      "game_action_placement_coords",
      sql`kind <> 'move' or (row is not null and col is not null)`,
    )
    .addCheckConstraint(
      "game_action_pass_coords",
      sql`kind <> 'pass' or (row is null and col is null)`,
    )
    .addCheckConstraint("game_action_row_valid", sql`row is null or row between 0 and 7`)
    .addCheckConstraint("game_action_col_valid", sql`col is null or col between 0 and 7`)
    .addCheckConstraint("game_action_clock_ms_remaining_valid", sql`clock_ms_remaining >= 0`)
    .execute();

  await database.schema
    .createIndex("game_action_game_id_idx")
    .on("game_action")
    .column("game_id")
    .execute();

  await database.schema
    .createTable("game_message")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("game_id", "uuid", (col) => col.references("game.id").onDelete("cascade").notNull())
    .addColumn("user_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("content", "varchar(500)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("game_message_content_not_empty", sql`length(trim(content)) > 0`)
    .execute();

  await database.schema
    .createIndex("game_message_game_id_idx")
    .on("game_message")
    .column("game_id")
    .execute();
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema.dropTable("game_message").execute();
  await database.schema.dropTable("game_action").execute();
  await database.schema.dropTable("game").execute();
}
