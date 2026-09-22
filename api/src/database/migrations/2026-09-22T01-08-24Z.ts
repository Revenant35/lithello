import { type Kysely, sql } from "kysely";

export async function up(database: Kysely<unknown>): Promise<void> {
  await database.schema
    .createTable("game")
    .addColumn("id", "uuid", (column) => column.primaryKey())
    .addColumn("black_user_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("white_user_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("status", "varchar(16)", (col) => col.notNull().defaultTo("active"))
    .addColumn("result", "varchar(16)")
    .addColumn("end_reason", "varchar(16)")
    .addColumn("current_board", "varchar(64)", (col) => col.notNull())
    .addColumn("current_turn", "varchar(5)", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("black_score", "smallint")
    .addColumn("white_score", "smallint")
    .addColumn("started_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("ended_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("game_players_different", sql`black_user_id <> white_user_id`)
    .addCheckConstraint("game_status_valid", sql`status in ('active', 'finished', 'abandoned')`)
    .addCheckConstraint(
      "game_result_valid",
      sql`result is null or result in ('black', 'white', 'draw')`,
    )
    .addCheckConstraint(
      "game_end_reason_valid",
      sql`end_reason is null or end_reason in ('normal', 'resignation', 'timeout', 'disconnect')`,
    )
    .addCheckConstraint("game_current_turn_valid", sql`current_turn in ('black', 'white')`)
    .addCheckConstraint(
      "game_black_score_valid",
      sql`black_score is null or black_score between 0 and 64`,
    )
    .addCheckConstraint(
      "game_white_score_valid",
      sql`white_score is null or white_score between 0 and 64`,
    )
    .execute();

  await database.schema
    .createIndex("game_black_user_id_idx")
    .on("game")
    .column("black_user_id")
    .execute();

  await database.schema
    .createIndex("game_white_user_id_idx")
    .on("game")
    .column("white_user_id")
    .execute();

  await database.schema
    .createTable("game_move")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("game_id", "uuid", (col) => col.references("game.id").onDelete("cascade").notNull())
    .addColumn("user_id", "uuid", (col) => col.references("user.id").notNull())
    .addColumn("move_number", "smallint", (col) => col.notNull())
    .addColumn("x", "smallint", (col) => col.notNull())
    .addColumn("y", "smallint", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("game_move_game_move_number_unique", ["game_id", "move_number"])
    .addCheckConstraint("game_move_number_valid", sql`move_number between 1 and 60`)
    .addCheckConstraint("game_move_x_valid", sql`x between 0 and 7`)
    .addCheckConstraint("game_move_y_valid", sql`y between 0 and 7`)
    .execute();

  await database.schema
    .createIndex("game_move_game_id_idx")
    .on("game_move")
    .column("game_id")
    .execute();
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema.dropTable("game_move").execute();
  await database.schema.dropTable("game").execute();
}
