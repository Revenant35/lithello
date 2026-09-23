import { z } from "zod";

export const IdleClockSchema = z.object({
  kind: z.literal("idle"),
  clockTimeMilliseconds: z.int().nonnegative(),
});
export type IdleClock = z.infer<typeof IdleClockSchema>;

export const ActiveClockSchema = z.object({
  kind: z.literal("active"),
  expiresAt: z.iso.datetime(),
});
export type ActiveClock = z.infer<typeof ActiveClockSchema>;

export const ClockSchema = z.discriminatedUnion("kind", [
  IdleClockSchema,
  ActiveClockSchema,
]);
export type Clock = z.infer<typeof ClockSchema>;
