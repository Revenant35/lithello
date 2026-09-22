import { Logger } from "@nestjs/common";
import { err, ok, ResultAsync } from "neverthrow";
import { type RedisClientPoolType, type RedisClientType, WatchError } from "redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RedisService, RedisServiceError } from "./redis.service.ts";

function setup() {
  const client = {
    isWatching: false,
    watch: vi.fn(async (_key: string) => {
      client.isWatching = true;
    }),
    unwatch: vi.fn(async () => {
      client.isWatching = false;
    }),
  };
  let checkedOut = false;
  const pool = {
    execute: vi.fn(async (operation: (client: RedisClientType) => unknown) => {
      checkedOut = true;
      try {
        return await operation(client as unknown as RedisClientType);
      } finally {
        checkedOut = false;
      }
    }),
  };

  return {
    client,
    pool,
    isCheckedOut: () => checkedOut,
    service: new RedisService(pool as unknown as RedisClientPoolType),
  };
}

describe("RedisService.withWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a composable ResultAsync and cleans up an early return", async () => {
    const { service, client } = setup();
    const operation = vi.fn(() => Promise.resolve(ok("value")));

    const result = service.withWatch("session:1", operation);

    expect(result).toBeInstanceOf(ResultAsync);
    expect(await result.map((value) => value.toUpperCase())).toEqual(ok("VALUE"));
    expect(client.watch).toHaveBeenCalledWith("lithello:session:1");
    expect(operation).toHaveBeenCalledWith(client, "lithello:session:1");
    expect(client.unwatch).toHaveBeenCalledOnce();
    expect(client.isWatching).toBe(false);
  });

  it("releases the connection during backoff and reacquires it for the retry", async () => {
    const { service, client, pool, isCheckedOut } = setup();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new WatchError())
      .mockResolvedValueOnce(ok("updated"));

    const result = service.withWatch("session:1", operation);
    await vi.advanceTimersByTimeAsync(0);

    expect(operation).toHaveBeenCalledOnce();
    expect(client.isWatching).toBe(false);
    expect(isCheckedOut()).toBe(false);
    expect(vi.getTimerCount()).toBe(1);

    await vi.runAllTimersAsync();

    expect(await result).toEqual(ok("updated"));
    expect(pool.execute).toHaveBeenCalledTimes(2);
    expect(client.watch).toHaveBeenCalledTimes(2);
  });

  it("returns a conflict after five retries rather than rejecting", async () => {
    const { service, pool, isCheckedOut } = setup();
    const operation = vi.fn().mockRejectedValue(new WatchError());

    const result = service.withWatch("session:1", operation);
    await vi.runAllTimersAsync();

    expect(await result).toEqual(err(RedisServiceError.WatchConflict));
    expect(operation).toHaveBeenCalledTimes(6);
    expect(pool.execute).toHaveBeenCalledTimes(6);
    expect(isCheckedOut()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["acquire", "watch", "operation", "unwatch"] as const)(
    "returns and logs a Redis error on %s failure without retrying",
    async (stage) => {
      const { service, client, pool, isCheckedOut } = setup();
      const failure = new Error(`${stage} failed`);
      const operation = vi.fn().mockResolvedValue(ok("value"));
      if (stage === "acquire") pool.execute.mockRejectedValueOnce(failure);
      if (stage === "watch") client.watch.mockRejectedValueOnce(failure);
      if (stage === "operation") operation.mockRejectedValueOnce(failure);
      if (stage === "unwatch") client.unwatch.mockRejectedValueOnce(failure);

      expect(await service.withWatch("session:1", operation)).toEqual(
        err(RedisServiceError.RedisError),
      );
      expect(pool.execute).toHaveBeenCalledOnce();
      expect(Logger.prototype.error).toHaveBeenCalledWith(failure);
      expect(isCheckedOut()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
