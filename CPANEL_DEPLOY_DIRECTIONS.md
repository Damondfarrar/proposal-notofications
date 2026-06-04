# cPanel Deployment Directions (SmartPricing Finance Notifier)

This guide explains how to deploy the notifier to a Linux server with cPanel.

## 1) Upload files
1. In cPanel, open **File Manager**.
2. Create a folder for the app, for example:
   - `/home/<cpanel-user>/apps/smartpricing-finance-notifier`
3. Upload `finance-notifier-cpanel-deploy.zip` to that folder.
4. Extract the zip in place.

## 2) Create environment file
1. In the extracted project folder, create a file named `.env`.
2. Copy values from `.env.example` and fill in real credentials.

Minimum required variables:

```env
API_BASE_URL=https://web.smartpricingtable.com
API_TOKEN=YOUR_API_TOKEN

POSTMARK_SMTP_HOST=smtp.postmarkapp.com
POSTMARK_SMTP_PORT=587
POSTMARK_SMTP_SECURE=false
POSTMARK_SMTP_USER=YOUR_POSTMARK_SERVER_TOKEN
POSTMARK_SMTP_PASS=YOUR_POSTMARK_SERVER_TOKEN

MAIL_FROM=proposals@yourdomain.com
FINANCE_TO=finance@yourdomain.com
FINANCE_CC=
FINANCE_BCC=

POLL_INTERVAL_SECONDS=300
PROPOSALS_PAGE_SIZE=50
MAX_PAGES=20
SIGNING_COMPLETION_MODE=lenient
STRICT_STATUS_WON_ONLY=false
PRICE_UNIT_MODE=auto
DRY_RUN=false

DB_PATH=/home/<cpanel-user>/apps/smartpricing-finance-notifier/data/notifier.db
PROPOSAL_APP_URL_BASE=https://web.smartpricingtable.com/proposals
```

## 3) Install Node dependencies (SSH)
SSH into server, then run:

```bash
cd /home/<cpanel-user>/apps/smartpricing-finance-notifier
npm install
```

If your host supports it, `npm ci` is preferred when lockfile is present.

## 4) First validation run
Run a one-time execution:

```bash
node src/worker.js --once
```

Check logs/output for:
- successful API access
- extracted grouped services
- email send success (or DRY_RUN output)
- SQLite idempotency state creation

## 5) Schedule execution

### Option A: cPanel Cron Jobs (most common)
1. cPanel → **Cron Jobs**
2. Add job (every 5 minutes):
   ```bash
   */5 * * * * cd /home/<cpanel-user>/apps/smartpricing-finance-notifier && /usr/bin/node src/worker.js --once >> /home/<cpanel-user>/apps/smartpricing-finance-notifier/worker.log 2>&1
   ```

Adjust Node path if needed:
- Find with: `which node`

### Option B: systemd service (if root access)
Use a dedicated service/timer for persistent operation. This is generally more robust than cron.

## 6) Subdomain setup (optional)
This project is a background worker and does not require a web subdomain.
If you still want one for operational docs/status:
1. cPanel → Domains → create subdomain (e.g., `finance-notify.yourdomain.com`)
2. Point document root to a folder with static ops docs if desired.
3. Worker continues running via cron/systemd independently.

## 7) Security checklist
- Restrict `.env` file permissions.
- Do not expose API token in public directories.
- Use least-privilege API token.
- Rotate Postmark credentials periodically.
- Keep logs private (they may contain proposal metadata).

## 8) Troubleshooting
- **401 Unauthorized**: bad/expired API token.
- **403 Forbidden**: token lacks org/permission scope.
- **500 on list endpoint**: upstream API issue; worker should retry next cycle.
- **No emails sent**: check signing/won gate and idempotency table.
- **Wrong amounts**: keep `PRICE_UNIT_MODE=auto` unless your data model is uniform.

## 9) Recommended production defaults
- `PRICE_UNIT_MODE=auto`
- `SIGNING_COMPLETION_MODE=lenient` initially
- `POLL_INTERVAL_SECONDS=300`
- keep `DRY_RUN=false` after validation
