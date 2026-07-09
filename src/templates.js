const { centsToCurrency } = require("./serviceExtractor");

function proposalUrl(config, proposalId) {
  if (!config?.app?.proposalAppUrlBase) return "";
  return `${config.app.proposalAppUrlBase.replace(/\/+$/, "")}/proposals/${proposalId}`;
}

function renderServicesTableText(lines, currency = "USD") {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "No selected services were detected.\n";
  }

  const rows = lines.map((line) => {
    const lineAmount =
      typeof line.lineAmountCents === "number"
        ? centsToCurrency(line.lineAmountCents, currency)
        : line.displayAmount || "N/A";

    return `- ${line.itemName} | Page: ${line.pageName} | Section: ${line.sectionName} | Freq: ${line.frequency} | Qty: ${line.quantity} | Amount: ${lineAmount}`;
  });

  return `${rows.join("\n")}\n`;
}

function renderGroupedServicesText(grouped = [], currency = "USD") {
  if (!Array.isArray(grouped) || grouped.length === 0) {
    return "No selected services were detected.\n";
  }

  return grouped
    .map((group) => {
      const services = renderServicesTableText(group.lines, currency).trim();
      const subtotal = renderTotalsText(group.totalsByFrequency, currency);
      return `${group.category}\n${services}\nSubtotal\n${subtotal}`;
    })
    .join("\n\n");
}

function renderTotalsText(totalsByFrequency = {}, currency = "USD") {
  const entries = Object.entries(totalsByFrequency);
  if (entries.length === 0) return "No numeric totals available.\n";

  return entries
    .map(([freq, cents]) => `- ${freq}: ${centsToCurrency(cents, currency)}`)
    .join("\n");
}

function renderServicesTableHtml(lines, currency = "USD") {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "<p style=\"margin:0;color:#475467;\">No selected services were detected.</p>";
  }

  const rows = lines
    .map((line) => {
      const lineAmount =
        typeof line.lineAmountCents === "number"
          ? centsToCurrency(line.lineAmountCents, currency)
          : line.displayAmount || "N/A";

      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#101828;">${escapeHtml(line.itemName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#344054;">${escapeHtml(line.pageName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#344054;">${escapeHtml(line.sectionName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#344054;">${escapeHtml(line.frequency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#344054;text-align:center;">${escapeHtml(String(line.quantity))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#101828;text-align:right;font-weight:600;">${escapeHtml(lineAmount)}</td>
      </tr>`;
    })
    .join("");

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EAECF0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;background:#ffffff;">
      <thead>
        <tr>
          <th align="left" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Service</th>
          <th align="left" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Page</th>
          <th align="left" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Section</th>
          <th align="left" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Frequency</th>
          <th align="center" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Qty</th>
          <th align="right" style="padding:10px 12px;background:#F9FAFB;color:#344054;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderGroupedServicesHtml(grouped = [], currency = "USD") {
  if (!Array.isArray(grouped) || grouped.length === 0) {
    return "<p style=\"margin:0;color:#475467;\">No selected services were detected.</p>";
  }

  return grouped
    .map((group) => {
      const table = renderServicesTableHtml(group.lines, currency);
      const subtotal = renderTotalsHtml(group.totalsByFrequency, currency);
      return `
        <div style="margin:0 0 20px 0;">
          <h4>${escapeHtml(group.category)}</h4>
          ${table}
          <div style="margin-top:10px;padding:10px 12px;background:#F9FAFB;border:1px solid #EAECF0;border-radius:8px;">
            <p style="margin:0 0 6px 0;color:#344054;font-weight:600;"><strong>Subtotal</strong></p>
            ${subtotal}
          </div>
        </div>
      `;
    })
    .join("\n");
}

function renderTotalsHtml(totalsByFrequency = {}, currency = "USD") {
  const entries = Object.entries(totalsByFrequency);
  if (entries.length === 0) return "<p style=\"margin:0;color:#475467;\">No numeric totals available.</p>";

  const rows = entries
    .map(([freq, cents]) => {
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#344054;text-transform:capitalize;">${escapeHtml(freq)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAECF0;color:#101828;text-align:right;font-weight:700;">${escapeHtml(
          centsToCurrency(cents, currency)
        )}</td>
      </tr>`;
    })
    .join("");

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EAECF0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;background:#ffffff;">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildFinanceEmail({ config, proposal, extracted }) {
  const currency = proposal?.cached_totals?.currency || "USD";
  const proposalId = proposal?.id || "unknown";
  const proposalName = proposal?.name || "Untitled Proposal";

  const recipient = proposal?.settings?.recipient || {};
  const contact = recipient?.contact || {};

  const wonAt = proposal?.timestamps?.won || "N/A";
  const signedPdfUrl = proposal?.status_detail?.signed_pdf_url || "N/A";
  const appUrl = proposalUrl(config, proposalId) || "N/A";

  const subject = `New Client Setup Required – ${proposalName} (${proposalId})`;

  const text = `
A proposal has met finance notification criteria (won + signing complete).

Proposal
- Name: ${proposalName}
- ID: ${proposalId}
- Won At: ${wonAt}
- Signed PDF: ${signedPdfUrl}
- Proposal URL: ${appUrl}

Client
- Company: ${recipient?.name || "N/A"}
- Address: ${recipient?.address || "N/A"}
- Website: ${recipient?.website || "N/A"}
- Contact Name: ${contact?.name || "N/A"}
- Contact Email: ${contact?.email || "N/A"}
- Contact Phone: ${contact?.phone || "N/A"}

Selected Services
${renderGroupedServicesText(extracted.grouped, currency)}

Totals
${renderTotalsText(extracted.totalsByFrequency, currency)}
  `.trim();

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>New Client Setup Required</title>
    </head>
    <body style="margin:0;padding:0;background:#F2F4F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#101828;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F2F4F7;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="700" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;width:100%;background:#ffffff;border:1px solid #EAECF0;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 16px 24px;background:linear-gradient(135deg,#0F172A,#1D4ED8);color:#ffffff;">
                  <h1 style="margin:0;font-size:22px;line-height:1.3;">New Client Setup Required</h1>
                  <p style="margin:8px 0 0 0;font-size:14px;opacity:.9;">A proposal has met finance notification criteria (won + signing complete).</p>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 24px;">
                  <h3 style="margin:0 0 10px 0;font-size:16px;color:#101828;">Proposal</h3>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #EAECF0;border-radius:10px;background:#FCFCFD;">
                    <tr><td style="padding:10px 12px;color:#344054;"><strong>Name:</strong> ${escapeHtml(proposalName)}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>ID:</strong> ${escapeHtml(proposalId)}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Won At:</strong> ${escapeHtml(wonAt)}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Signed PDF:</strong> ${
                      signedPdfUrl !== "N/A" ? `<a href="${escapeHtml(signedPdfUrl)}" style="color:#1D4ED8;text-decoration:none;">Open Signed PDF</a>` : "N/A"
                    }</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Proposal URL:</strong> ${
                      appUrl !== "N/A" ? `<a href="${escapeHtml(appUrl)}" style="color:#1D4ED8;text-decoration:none;">Open Proposal</a>` : "N/A"
                    }</td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <h3 style="margin:0 0 10px 0;font-size:16px;color:#101828;">Client</h3>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #EAECF0;border-radius:10px;background:#FCFCFD;">
                    <tr><td style="padding:10px 12px;color:#344054;"><strong>Company:</strong> ${escapeHtml(recipient?.name || "N/A")}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Address:</strong> ${escapeHtml(recipient?.address || "N/A")}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Website:</strong> ${escapeHtml(recipient?.website || "N/A")}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Contact Name:</strong> ${escapeHtml(contact?.name || "N/A")}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Contact Email:</strong> ${escapeHtml(contact?.email || "N/A")}</td></tr>
                    <tr><td style="padding:10px 12px;color:#344054;border-top:1px solid #EAECF0;"><strong>Contact Phone:</strong> ${escapeHtml(contact?.phone || "N/A")}</td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <h3 style="margin:0 0 10px 0;font-size:16px;color:#101828;">Selected Services</h3>
                  ${renderGroupedServicesHtml(extracted.grouped, currency)}
                </td>
              </tr>

              <tr>
                <td style="padding:0 24px 24px 24px;">
                  <h3 style="margin:0 0 10px 0;font-size:16px;color:#101828;">Totals</h3>
                  ${renderTotalsHtml(extracted.totalsByFrequency, currency)}
                </td>
              </tr>

              <tr>
                <td style="padding:14px 24px;background:#F9FAFB;border-top:1px solid #EAECF0;color:#667085;font-size:12px;">
                  Finance Notification Worker
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `.trim();

  return { subject, text, html };
}

module.exports = { buildFinanceEmail };
