# SmartPricing Finance Notifier

Worker process that sends a finance email when a proposal is **won** and **signing is complete**.

## What it does

1. Polls `GET /api/proposals?status=won`
2. Fetches proposal detail from `GET /api/proposals/{id}`
3. Applies notification gate:
   - proposal is won
   - signing is complete
4. Extracts selected services and amounts
5. Sends finance email via Postmark SMTP relay
6. Stores idempotency marker in SQLite to prevent duplicate sends

---

## Requirements

- Node.js 18+
- Network access to SmartPricing API and Postmark SMTP
- Linux server (recommended deployment target)

---

## Setup

```bash
cp .env.example .env
npm install
```

Configure `.env`:

- API credentials
- Postmark relay credentials
- finance recipients
- worker options

---

## Run

One-shot execution:

```bash
node src/worker.js --once
```

Continuous polling:

```bash
node src/worker.js
```

NPM scripts:

```bash
npm run run:once
npm start
```

---

## Environment variables

See `.env.example`.

Key variables:

- `API_BASE_URL`
- `API_TOKEN`
- `API_AUTH_HEADER` (optional, default: `Authorization`)
- `API_AUTH_SCHEME` (optional, default: `Bearer`; set empty to omit scheme prefix)
- `API_AUTH_RAW_TOKEN` (optional, default: `false`; when `true`, sends raw token value without scheme)
- `POSTMARK_SMTP_HOST`, `POSTMARK_SMTP_PORT`, `POSTMARK_SMTP_USER`, `POSTMARK_SMTP_PASS`
- `MAIL_FROM`, `FINANCE_TO`
- `SIGNING_COMPLETION_MODE` (`lenient` or `strict`)
- `DRY_RUN` (`true` recommended initially)

---

## Signing completion logic

- **lenient** (default): signed PDF OR completed signatures OR completion signature event
- **strict**: signed PDF OR all signatures completed

---

## Idempotency

SQLite database tracks sent notifications in:

- `notified_proposals(proposal_id PK, notified_at, email_message_id, checksum)`

Default DB path:

- `./data/notifier.db`

---

## Linux deployment (systemd)

Example `/etc/systemd/system/smartpricing-finance-notifier.service`:

```ini
[Unit]
Description=SmartPricing Finance Notifier
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/smartpricing-finance-notifier
ExecStart=/usr/bin/node /opt/smartpricing-finance-notifier/src/worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Commands:

```bash
sudo systemctl daemon-reload
sudo systemctl enable smartpricing-finance-notifier
sudo systemctl start smartpricing-finance-notifier
sudo systemctl status smartpricing-finance-notifier
```

Logs:

```bash
journalctl -u smartpricing-finance-notifier -f
```

---

## Validation checklist

1. Start with `DRY_RUN=true`
2. Run `--once`
3. Confirm:
   - eligible proposals are detected
   - selected services render correctly
   - no duplicates on repeat run
4. Switch `DRY_RUN=false` to enable sending

---

## Notes

- This implementation uses polling because webhook endpoints were not specified in the provided API.
- If you later add webhooks, this worker can be adapted to event-driven dispatch.
