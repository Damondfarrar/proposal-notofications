const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function optionalBool(name, fallback = false) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function optionalCsv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  api: {
    baseUrl: required("API_BASE_URL").replace(/\/+$/, ""),
    authToken: required("API_TOKEN"),
    requestTimeoutMs: optionalInt("API_TIMEOUT_MS", 20000)
  },
  smtp: {
    host: required("POSTMARK_SMTP_HOST"),
    port: optionalInt("POSTMARK_SMTP_PORT", 587),
    secure: optionalBool("POSTMARK_SMTP_SECURE", false),
    user: required("POSTMARK_SMTP_USER"),
    pass: required("POSTMARK_SMTP_PASS")
  },
  mail: {
    from: required("MAIL_FROM"),
    financeTo: optionalCsv("FINANCE_TO"),
    financeCc: optionalCsv("FINANCE_CC"),
    financeBcc: optionalCsv("FINANCE_BCC")
  },
  worker: {
    intervalSeconds: optionalInt("POLL_INTERVAL_SECONDS", 300),
    pageSize: optionalInt("PROPOSALS_PAGE_SIZE", 50),
    dbPath: process.env.DB_PATH || path.join(process.cwd(), "data", "notifier.db"),
    signingMode: process.env.SIGNING_COMPLETION_MODE || "lenient",
    dryRun: optionalBool("DRY_RUN", false),
    maxPages: optionalInt("MAX_PAGES", 20),
    strictStatusWonOnly: optionalBool("STRICT_STATUS_WON_ONLY", false),
    priceUnitMode: (process.env.PRICE_UNIT_MODE || "auto").toLowerCase()
  },
  app: {
    proposalAppUrlBase: process.env.PROPOSAL_APP_URL_BASE || ""
  }
};

if (!Array.isArray(config.mail.financeTo) || config.mail.financeTo.length === 0) {
  throw new Error("FINANCE_TO must include at least one recipient email.");
}

module.exports = { config };
