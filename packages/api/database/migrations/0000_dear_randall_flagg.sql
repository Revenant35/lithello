CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"white_user_id" uuid NOT NULL,
	"black_user_id" uuid NOT NULL,
	"time_control_id" uuid NOT NULL,
	"white_rating_before" smallint NOT NULL,
	"black_rating_before" smallint NOT NULL,
	"is_rated" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"result" varchar(16),
	"end_reason" varchar(16),
	"final_white_pieces" bigint,
	"final_black_pieces" bigint,
	"white_rating_after" smallint,
	"black_rating_after" smallint,
	CONSTRAINT "game_players_different" CHECK ("game"."white_user_id" <> "game"."black_user_id"),
	CONSTRAINT "game_result_valid" CHECK ("game"."result" is null or "game"."result" in ('white_win', 'black_win', 'draw')),
	CONSTRAINT "game_end_reason_valid" CHECK ("game"."end_reason" is null or "game"."end_reason" in ('normal', 'resignation', 'timeout')),
	CONSTRAINT "game_result_iff_ended" CHECK (("game"."ended_at" is null) = ("game"."result" is null)),
	CONSTRAINT "game_end_reason_iff_ended" CHECK (("game"."ended_at" is null) = ("game"."end_reason" is null)),
	CONSTRAINT "game_final_pieces_iff_ended" CHECK (("game"."ended_at" is null) = ("game"."final_white_pieces" is null)),
	CONSTRAINT "game_final_pieces_both_or_neither" CHECK (("game"."final_white_pieces" is null) = ("game"."final_black_pieces" is null)),
	CONSTRAINT "game_final_pieces_disjoint" CHECK ("game"."final_white_pieces" & "game"."final_black_pieces" = 0),
	CONSTRAINT "game_started_after_created" CHECK ("game"."started_at" >= "game"."created_at"),
	CONSTRAINT "game_ended_after_started" CHECK ("game"."ended_at" >= "game"."started_at"),
	CONSTRAINT "game_ended_requires_started" CHECK ("game"."ended_at" is null or "game"."started_at" is not null),
	CONSTRAINT "game_white_rating_before_valid" CHECK ("game"."white_rating_before" >= 0),
	CONSTRAINT "game_black_rating_before_valid" CHECK ("game"."black_rating_before" >= 0),
	CONSTRAINT "game_white_rating_after_valid" CHECK ("game"."white_rating_after" >= 0),
	CONSTRAINT "game_black_rating_after_valid" CHECK ("game"."black_rating_after" >= 0),
	CONSTRAINT "game_rating_after_iff_ended" CHECK (("game"."ended_at" is null) = ("game"."white_rating_after" is null)),
	CONSTRAINT "game_unrated_ratings_unchanged" CHECK ("game"."is_rated"
        or "game"."white_rating_after" is null
        or ("game"."white_rating_after" = "game"."white_rating_before"
          and "game"."black_rating_after" = "game"."black_rating_before")),
	CONSTRAINT "game_rating_after_both_or_neither" CHECK (("game"."white_rating_after" is null) = ("game"."black_rating_after" is null))
);
--> statement-breakpoint
CREATE TABLE "game_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_message_content_not_blank" CHECK ("game_message"."content" ~ '[^[:space:]]'),
	CONSTRAINT "game_message_content_length" CHECK (length("game_message"."content") <= 500)
);
--> statement-breakpoint
CREATE TABLE "game_move" (
	"game_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"white_pieces" bigint NOT NULL,
	"black_pieces" bigint NOT NULL,
	"square" smallint,
	"white_time_ms" integer NOT NULL,
	"black_time_ms" integer NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_move_game_id_ply_pk" PRIMARY KEY("game_id","ply"),
	CONSTRAINT "game_move_one_play_per_square" UNIQUE("game_id","square"),
	CONSTRAINT "game_move_square_valid" CHECK ("game_move"."square" >= 0 and "game_move"."square" < 64),
	CONSTRAINT "game_move_ply_valid" CHECK ("game_move"."ply" >= 0),
	CONSTRAINT "game_move_pieces_disjoint" CHECK ("game_move"."white_pieces" & "game_move"."black_pieces" = 0),
	CONSTRAINT "game_move_white_time_ms_valid" CHECK ("game_move"."white_time_ms" >= 0),
	CONSTRAINT "game_move_black_time_ms_valid" CHECK ("game_move"."black_time_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_time_control" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_clock_ms" integer NOT NULL,
	"increment_ms" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "game_time_control_unique" UNIQUE("start_clock_ms","increment_ms"),
	CONSTRAINT "game_time_control_start_clock_ms_valid" CHECK ("game_time_control"."start_clock_ms" > 0),
	CONSTRAINT "game_time_control_increment_ms_valid" CHECK ("game_time_control"."increment_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_white_user_id_user_id_fk" FOREIGN KEY ("white_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_black_user_id_user_id_fk" FOREIGN KEY ("black_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_time_control_id_game_time_control_id_fk" FOREIGN KEY ("time_control_id") REFERENCES "public"."game_time_control"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_message" ADD CONSTRAINT "game_message_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_message" ADD CONSTRAINT "game_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_move" ADD CONSTRAINT "game_move_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "game_white_user_id_idx" ON "game" USING btree ("white_user_id");--> statement-breakpoint
CREATE INDEX "game_black_user_id_idx" ON "game" USING btree ("black_user_id");--> statement-breakpoint
CREATE INDEX "game_active_idx" ON "game" USING btree ("id") WHERE "game"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "game_message_game_id_created_at_idx" ON "game_message" USING btree ("game_id","created_at");