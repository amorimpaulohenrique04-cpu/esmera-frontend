import { assertEquals, assertStrictEquals } from "@std/assert";
import { PayloadAPIError } from "../../lib/payload/errors.ts";
import {
  createShellCache,
  type ShellRefreshFailure,
} from "../../lib/payload/shellCache.ts";

type Snapshot = { revision: string; menu: string[] };

const v1: Snapshot = { revision: "v1", menu: ["Coleções", "Escultura"] };
const v2: Snapshot = { revision: "v2", menu: ["Escultura", "Coleções"] };

function setup(loads: Array<() => Promise<Snapshot>>) {
  let clock = 1_000_000;
  let calls = 0;
  const failures: ShellRefreshFailure[] = [];
  const cache = createShellCache<Snapshot>({
    load: () => loads[Math.min(calls++, loads.length - 1)](),
    revisionOf: (value) => value.revision,
    freshMs: 15_000,
    waitMs: 20,
    retryAfterFailureMs: 10_000,
    now: () => clock,
    onRefreshFailure: (failure) => failures.push(failure),
  });
  return {
    cache,
    failures,
    calls: () => calls,
    advance: (ms: number) => {
      clock += ms;
    },
    clock: () => clock,
  };
}

const ok = (value: Snapshot) => () => Promise.resolve(value);
const fail = (kind: "timeout" | "http" = "timeout", status?: number) => () =>
  Promise.reject(new PayloadAPIError(kind, "falhou", status));
const never = () => new Promise<Snapshot>(() => {});

Deno.test("serve o valor em memória enquanto está fresco, sem nova leitura", async () => {
  const t = setup([ok(v1), ok(v2)]);
  assertEquals(await t.cache.read(), { value: v1, stale: false });
  t.advance(14_999);
  assertEquals(await t.cache.read(), { value: v1, stale: false });
  assertEquals(t.calls(), 1);
});

Deno.test("publicação aparece na primeira leitura depois de expirar", async () => {
  const t = setup([ok(v1), ok(v2)]);
  await t.cache.read();
  t.advance(15_000);
  assertEquals(await t.cache.read(), { value: v2, stale: false });
  assertEquals(t.cache.status().revision, "v2");
});

Deno.test("timeout mantém o último menu válido e não esvazia", async () => {
  const t = setup([ok(v1), fail("timeout")]);
  await t.cache.read();
  t.advance(20_000);
  assertEquals(await t.cache.read(), { value: v1, stale: true });
  assertEquals(t.failures, [{
    errorType: "timeout",
    httpStatus: null,
    hasLastValid: true,
    ageMs: 20_000,
  }]);
});

Deno.test("a espera do visitante é limitada e a atualização continua", async () => {
  let finish: (value: Snapshot) => void = () => {};
  const slow = () => new Promise<Snapshot>((resolve) => (finish = resolve));
  const t = setup([ok(v1), slow]);
  await t.cache.read();
  t.advance(20_000);

  const startedAt = performance.now();
  assertEquals(await t.cache.read(), { value: v1, stale: true });
  assertEquals(performance.now() - startedAt < 1_000, true);
  assertEquals(t.cache.status().refreshing, true);

  finish(v2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(await t.cache.read(), { value: v2, stale: false });
  assertEquals(t.calls(), 2);
});

Deno.test("leituras simultâneas compartilham a mesma atualização", async () => {
  const t = setup([ok(v1), never]);
  await t.cache.read();
  t.advance(20_000);
  await Promise.all([t.cache.read(), t.cache.read(), t.cache.read()]);
  assertEquals(t.calls(), 2);
});

Deno.test("durante falha do CMS não atrasa cada página", async () => {
  const t = setup([ok(v1), fail("http", 500), ok(v2)]);
  await t.cache.read();
  t.advance(20_000);
  await t.cache.read();
  t.advance(9_999);
  assertEquals(await t.cache.read(), { value: v1, stale: true });
  assertEquals(t.calls(), 2);
  t.advance(1);
  assertEquals(await t.cache.read(), { value: v2, stale: false });
  assertEquals(t.cache.status().lastError, null);
});

Deno.test("sem dado válido devolve null e marca página degradada", async () => {
  const t = setup([fail("http", 503)]);
  const before = t.clock();
  assertStrictEquals(await t.cache.read(), null);
  assertEquals(t.cache.degradedSince(before), true);
  assertEquals(t.cache.degradedSince(before + 1), false);
  assertEquals(t.failures[0].hasLastValid, false);
  assertEquals(t.failures[0].httpStatus, 503);
});

Deno.test("diagnóstico expõe revisão, idade e último erro, sem mensagem interna", async () => {
  const t = setup([ok(v1), fail("http", 500)]);
  await t.cache.read();
  t.advance(16_000);
  await t.cache.read();
  const status = t.cache.status();
  assertEquals(status.hasData, true);
  assertEquals(status.revision, "v1");
  assertEquals(status.ageMs, 16_000);
  assertEquals(status.lastError, "http");
  assertEquals(typeof status.lastFailureAt, "string");
  assertEquals(JSON.stringify(status).includes("falhou"), false);
});
