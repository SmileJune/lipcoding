const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

describe("codex notify", () => {
  it("parses dotenv values without exposing secrets", async () => {
    const { parseEnv } = await import("./codex-notify.mjs");

    assert.deepEqual(
      parseEnv(`
        # local credentials
        TELEGRAM_BOT_TOKEN="token:value"
        TELEGRAM_CHAT_ID='12345'
        IGNORED_LINE
        EXTRA=plain
      `),
      {
        TELEGRAM_BOT_TOKEN: "token:value",
        TELEGRAM_CHAT_ID: "12345",
        EXTRA: "plain",
      },
    );
  });

  it("builds project-scoped status messages", async () => {
    const { buildMessage } = await import("./codex-notify.mjs");

    assert.equal(
      buildMessage("done", "알림 테스트 완료"),
      "curio done: 알림 테스트 완료",
    );
    assert.equal(buildMessage("failed"), "curio failed");
  });

  it("rejects an empty status", async () => {
    const { buildMessage } = await import("./codex-notify.mjs");

    assert.throws(() => buildMessage("   "), /status is required/);
  });
});
