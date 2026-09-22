import { z } from "zod";

export const BOARD_SIZE = 8;
export const BOARD_AREA = BOARD_SIZE ** 2;

export const INITIAL_BOARD: Board = [
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, "w", "b", null, null, null],
  [null, null, null, "b", "w", null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
];

export enum BoardError {
  ILLEGAL_MOVE = "Illegal Move",
}

export const PLAYER_COLORS = ["w", "b"] as const;
export const PlayerColorSchema = z.enum(PLAYER_COLORS);
export type PlayerColor = z.infer<typeof PlayerColorSchema>;

export const BoardCellColorSchema = PlayerColorSchema.nullable();
export type BoardCellColor = z.infer<typeof BoardCellColorSchema>;

export const PlayerScoreSchema = z.int().min(0).max(BOARD_AREA);
export type PlayerScore = z.infer<typeof PlayerScoreSchema>;

export const GameScoreSchema = z
  .record(PlayerColorSchema, PlayerScoreSchema)
  .refine((v) => v["w"] + v["b"] <= BOARD_AREA);
export type GameScore = z.infer<typeof GameScoreSchema>;

export const BoardLocationSchema = z.object({
  row: z.int().gte(0).lt(BOARD_SIZE),
  col: z.int().gte(0).lt(BOARD_SIZE),
});
export type BoardLocation = z.infer<typeof BoardLocationSchema>;

export const BoardSchema = z
  .array(z.array(PlayerColorSchema.nullable()).length(BOARD_SIZE))
  .length(BOARD_SIZE);
export type Board = z.infer<typeof BoardSchema>;
