import z from 'zod';

export const BOARD_SIZE = 8;

export const PlayerColorSchema = z.enum(['w', 'b']);
export type PlayerColor = z.infer<typeof PlayerColorSchema>;

export const BoardCellSchema = PlayerColorSchema.nullable();
export type BoardCell = z.infer<typeof BoardCellSchema>;

export const BoardLocationSchema = z.object({
  row: z.int().gte(0).lt(BOARD_SIZE),
  col: z.int().gte(0).lt(BOARD_SIZE),
});
export type BoardLocation = z.infer<typeof BoardLocationSchema>;

export const BoardSchema = z
  .array(z.array(BoardCellSchema).length(BOARD_SIZE))
  .length(BOARD_SIZE);
export type Board = z.infer<typeof BoardSchema>;
