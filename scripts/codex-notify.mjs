import { readFile } from "node:fs/promises";
import https from "node:https";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ENV_PATH = resolve(process.cwd(), ".env.codex-notify");
export const PROJECT_NAME = "curio";
const TELEGRAM_HOST = "api.telegram.org";

export function parseEnv(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env[key] = unquote(rawValue.trim());
  }

  return env;
}

export function buildMessage(status, detail = "") {
  const normalizedStatus = status.trim();
  const normalizedDetail = detail.trim();

  if (!normalizedStatus) {
    throw new Error("Notification status is required.");
  }

  if (normalizedDetail) {
    return `${PROJECT_NAME} ${normalizedStatus}: ${normalizedDetail}`;
  }

  return `${PROJECT_NAME} ${normalizedStatus}`;
}

export async function loadConfig(envPath = ENV_PATH) {
  const content = await readFile(envPath, "utf8");
  const env = parseEnv(content);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new Error(
      ".env.codex-notify must define TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID",
    );
  }

  return {
    token: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  };
}

export async function sendTelegramMessage({ token, chatId, text }) {
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

  await new Promise((resolvePromise, reject) => {
    const request = https.request(
      {
        hostname: TELEGRAM_HOST,
        path: `/bot${token}/sendMessage`,
        method: "POST",
        family: 4,
        timeout: 10_000,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (response) => {
        response.resume();

        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolvePromise();
            return;
          }

          reject(
            new Error(`Telegram sendMessage failed with HTTP ${response.statusCode}`),
          );
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("Telegram sendMessage timed out"));
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end(body);
  });
}

export async function main(argv = process.argv.slice(2)) {
  const [status, ...detailParts] = argv;

  if (!status) {
    throw new Error(
      "Usage: node scripts/codex-notify.mjs <status> [message details...]",
    );
  }

  const config = await loadConfig();
  const text = buildMessage(status, detailParts.join(" "));

  await sendTelegramMessage({
    token: config.token,
    chatId: config.chatId,
    text,
  });

  console.log("Telegram notification sent.");
}

function unquote(value) {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\n", "\n");
  }

  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.code || error.message);
    process.exitCode = 1;
  });
}
