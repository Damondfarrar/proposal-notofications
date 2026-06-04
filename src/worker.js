const crypto = require("crypto");
const { config } = require("./config");
const { ApiClient } = require("./apiClient");
const { StateStore } = require("./stateStore");
const { Mailer } = require("./mailer");
const { shouldNotify } = require("./signingRules");
const { extractSelectedServices } = require("./serviceExtractor");
const { buildFinanceEmail } = require("./templates");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checksumPayload(proposal, extracted) {
  const payload = JSON.stringify({
    id: proposal?.id,
    status: proposal?.status,
    won: proposal?.timestamps?.won,
    signedPdf: proposal?.status_detail?.signed_pdf_url,
    services: extracted?.lines || []
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function processOnce() {
  const api = new ApiClient(config.api);
  const store = new StateStore(config.worker.dbPath);
  const mailer = new Mailer({
    ...config.smtp,
    from: config.mail.from,
    dryRun: config.worker.dryRun
  });

  let page = 1;
  let processed = 0;
  let sent = 0;
  let skipped = 0;

  try {
    while (page <= config.worker.maxPages) {
      const { items, pagination } = await api.listWonProposals({
        page,
        limit: config.worker.pageSize
      });

      if (!items.length) break;

      for (const listItem of items) {
        processed += 1;
        const proposalId = listItem.id;
        if (!proposalId) {
          skipped += 1;
          continue;
        }

        if (store.hasNotified(proposalId)) {
          skipped += 1;
          continue;
        }

        let proposal;
        try {
          proposal = await api.getProposal(proposalId);
        } catch (err) {
          console.error(`[worker] Failed to fetch proposal ${proposalId}:`, err.message);
          skipped += 1;
          continue;
        }

        const eligible = shouldNotify(proposal, {
          signingMode: config.worker.signingMode,
          strictStatusWonOnly: config.worker.strictStatusWonOnly
        });

        if (!eligible) {
          skipped += 1;
          continue;
        }

        const extracted = extractSelectedServices(proposal);
        const email = buildFinanceEmail({ config, proposal, extracted });
        const checksum = checksumPayload(proposal, extracted);

        try {
          const sendResult = await mailer.send({
            to: config.mail.financeTo,
            cc: config.mail.financeCc,
            bcc: config.mail.financeBcc,
            subject: email.subject,
            text: email.text,
            html: email.html
          });

          store.markNotified({
            proposalId,
            emailMessageId: sendResult?.messageId || null,
            checksum
          });

          sent += 1;
          console.log(`[worker] Notification sent for proposal ${proposalId}.`);
        } catch (err) {
          console.error(`[worker] Failed to send email for ${proposalId}:`, err.message);
        }
      }

      const totalPages = Number(pagination?.pages || 1);
      if (page >= totalPages) break;
      page += 1;
    }
  } finally {
    store.close();
  }

  console.log(
    `[worker] cycle complete | processed=${processed} sent=${sent} skipped=${skipped} dryRun=${config.worker.dryRun}`
  );
}

async function run() {
  const once = process.argv.includes("--once");

  if (once) {
    await processOnce();
    return;
  }

  while (true) {
    try {
      await processOnce();
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;

      if (status >= 500) {
        console.error("[worker] transient upstream 5xx; skipping cycle:", { status, body });
      } else {
        console.error("[worker] fatal cycle error:", err);
      }
    }

    await sleep(config.worker.intervalSeconds * 1000);
  }
}

run().catch((err) => {
  console.error("[worker] unrecoverable startup error:", err);
  process.exit(1);
});
