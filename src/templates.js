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
    return "<p>No selected services were detected.</p>";
  }

  const rows = lines
    .map((line) => {
      const lineAmount =
        typeof line.lineAmountCents === "number"
          ? centsToCurrency(line.lineAmountCents, currency)
          : line.displayAmount || "N/A";

      return `
      <tr>
        <td>${escapeHtml(line.itemName)}</td>
        <td>${escapeHtml(line.pageName)}</td>
        <td>${escapeHtml(line.sectionName)}</td>
        <td>${escapeHtml(line.frequency)}</td>
        <td>${escapeHtml(String(line.quantity))}</td>
        <td>${escapeHtml(lineAmount)}</td>
      </tr>`;
    })
    .join("");

  return `
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th>Service</th>
          <th>Page</th>
          <th>Section</th>
          <th>Frequency</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderGroupedServicesHtml(grouped = [], currency = "USD") {
  if (!Array.isArray(grouped) || grouped.length === 0) {
    return "<p>No selected services were detected.</p>";
  }

  return grouped
    .map((group) => {
      const table = renderServicesTableHtml(group.lines, currency);
      const subtotal = renderTotalsHtml(group.totalsByFrequency, currency);
      return `
        <h4>${escapeHtml(group.category)}</h4>
        ${table}
        <p><strong>Subtotal</strong></p>
        ${subtotal}
      `;
    })
    .join("\n");
}

function renderTotalsHtml(totalsByFrequency = {}, currency = "USD") {
  const entries = Object.entries(totalsByFrequency);
  if (entries.length === 0) return "<p>No numeric totals available.</p>";

  const rows = entries
    .map(([freq, cents]) => {
      return `<li><strong>${escapeHtml(freq)}:</strong> ${escapeHtml(centsToCurrency(cents, currency))}</li>`;
    })
    .join("");

  return `<ul>${rows}</ul>`;
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
  <h2>New Client Setup Required</h2>
  <p>A proposal has met finance notification criteria (<strong>won + signing complete</strong>).</p>

  <h3>Proposal</h3>
  <ul>
    <li><strong>Name:</strong> ${escapeHtml(proposalName)}</li>
    <li><strong>ID:</strong> ${escapeHtml(proposalId)}</li>
    <li><strong>Won At:</strong> ${escapeHtml(wonAt)}</li>
    <li><strong>Signed PDF:</strong> ${
      signedPdfUrl !== "N/A" ? `<a href="${escapeHtml(signedPdfUrl)}">Open Signed PDF</a>` : "N/A"
    }</li>
    <li><strong>Proposal URL:</strong> ${
      appUrl !== "N/A" ? `<a href="${escapeHtml(appUrl)}">Open Proposal</a>` : "N/A"
    }</li>
  </ul>

  <h3>Client</h3>
  <ul>
    <li><strong>Company:</strong> ${escapeHtml(recipient?.name || "N/A")}</li>
    <li><strong>Address:</strong> ${escapeHtml(recipient?.address || "N/A")}</li>
    <li><strong>Website:</strong> ${escapeHtml(recipient?.website || "N/A")}</li>
    <li><strong>Contact Name:</strong> ${escapeHtml(contact?.name || "N/A")}</li>
    <li><strong>Contact Email:</strong> ${escapeHtml(contact?.email || "N/A")}</li>
    <li><strong>Contact Phone:</strong> ${escapeHtml(contact?.phone || "N/A")}</li>
  </ul>

  <h3>Selected Services</h3>
  ${renderGroupedServicesHtml(extracted.grouped, currency)}

  <h3>Totals</h3>
  ${renderTotalsHtml(extracted.totalsByFrequency, currency)}
  `.trim();

  return { subject, text, html };
}

module.exports = { buildFinanceEmail };
