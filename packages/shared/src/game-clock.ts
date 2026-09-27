import { z } from 'zod';

export const IdleGameClockSchema = z.object({
  clockTimeMilliseconds: z.int().nonnegative(),
});
export type IdleGameClock = z.infer<typeof IdleGameClockSchema>;

export const ActiveGameClockSchema = z.object({
  expiresAt: z.coerce.date(),
});
export type ActiveGameClock = z.infer<typeof ActiveGameClockSchema>;

export const GameClockSchema = z.discriminatedUnion('kind', [
  IdleGameClockSchema.extend({
    kind: z.literal('idle'),
  }),
  ActiveGameClockSchema.extend({
    kind: z.literal('active'),
  }),
]);
export type GameClock = z.infer<typeof GameClockSchema>;
