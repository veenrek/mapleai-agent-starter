// Free smoke checks for all four MapleAI gateways — no keys, no payments.
// Run: npm run smoke   (also runs in GitHub Actions on every push)
const origins = [
  "https://sol.mapleai.shop",
  "https://base.mapleai.shop",
  "https://polygon.mapleai.shop",
  "https://arc.mapleai.shop",
];

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log("ok  ", name); }
  catch (error) { failures += 1; console.error("FAIL", name, "-", error.message); }
}
function expect(condition, message) { if (!condition) throw new Error(message); }

for (const origin of origins) {
  await check(origin + " /v1/models", async () => {
    const res = await fetch(origin + "/v1/models", { signal: AbortSignal.timeout(20_000) });
    expect(res.ok, "HTTP " + res.status);
    const data = await res.json();
    const gpts = (data.data ?? []).filter((m) => typeof m.id === "string" && m.id.includes("gpt"));
    expect(gpts.length >= 3, `expected >=3 GPT models, got ${gpts.length}`);
  });

  await check(origin + " /v1/embeddings free 2048-dim", async () => {
    const res = await fetch(origin + "/v1/embeddings", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "smoke" }), signal: AbortSignal.timeout(30_000),
    });
    expect(res.ok, "HTTP " + res.status);
    const data = await res.json();
    expect(data.data?.[0]?.embedding?.length === 2048, "expected 2048-dim vector");
  });

  await check(origin + " discovery docs", async () => {
    for (const path of ["/openapi.json", "/.well-known/x402", "/.well-known/agent-card.json",
      "/service-endpoints.json", "/AI-AGENTS.md"]) {
      const res = await fetch(origin + path, { signal: AbortSignal.timeout(20_000) });
      expect(res.ok, path + " HTTP " + res.status);
    }
  });

  await check(origin + " chat 402 challenge shape", async () => {
    const res = await fetch(origin + "/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-6-luna", messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(20_000),
    });
    expect(res.status === 402, "expected 402, got " + res.status);
    const challenge = JSON.parse(Buffer.from(res.headers.get("payment-required"), "base64").toString("utf8"));
    expect(challenge.x402Version === 2, "x402Version !== 2");
    expect(challenge.accepts?.[0]?.scheme === "exact", "scheme !== exact");
  });

  await check(origin + " prepaid endpoints 401 shapes", async () => {
    // No key: the gateway itself answers 401 prepaid_key_required (not a 402 challenge).
    const noKey = await fetch(origin + "/prepaid/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-6-luna", messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(20_000),
    });
    expect(noKey.status === 401, "expected 401, got " + noKey.status);
    const noKeyBody = await noKey.json();
    expect(noKeyBody.error?.type === "prepaid_key_required", "type !== prepaid_key_required");

    // Fake key: forwarded to the prepaid API, which answers 401 AUTH_002 on both endpoints.
    const fakeAuth = { authorization: "Bearer oms_buy_smoke_invalid" };
    const fakeChat = await fetch(origin + "/prepaid/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json", ...fakeAuth },
      body: JSON.stringify({ model: "openai/gpt-6-luna", messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(20_000),
    });
    expect(fakeChat.status === 401, "expected 401, got " + fakeChat.status);
    const fakeChatBody = await fakeChat.json();
    expect(fakeChatBody.error?.code === "AUTH_002", "code !== AUTH_002");

    const fakeStatus = await fetch(origin + "/prepaid/status", { headers: fakeAuth, signal: AbortSignal.timeout(20_000) });
    expect(fakeStatus.status === 401, "expected 401, got " + fakeStatus.status);
  });
}

if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log("\nALL SMOKE CHECKS PASSED");
