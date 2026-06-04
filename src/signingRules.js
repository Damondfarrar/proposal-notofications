function isWon(proposal, { strictStatusWonOnly = false } = {}) {
  if (!proposal || typeof proposal !== "object") return false;

  const status = String(proposal.status || "").toUpperCase();
  const wonByStatus = status === "WON";
  if (strictStatusWonOnly) return wonByStatus;

  const wonTimestamp = proposal?.timestamps?.won;
  return wonByStatus || Boolean(wonTimestamp);
}

function hasSignedPdf(proposal) {
  return Boolean(proposal?.status_detail?.signed_pdf_url);
}

function allSignaturesCompleted(proposal) {
  const signatures = proposal?.status_detail?.signatures;
  if (!Array.isArray(signatures) || signatures.length === 0) return false;

  const statuses = signatures
    .map((s) => String(s?.status || "").toLowerCase())
    .filter(Boolean);

  if (statuses.length === 0) return false;
  return statuses.every((s) =>
    ["completed", "signed", "approved", "done"].includes(s)
  );
}

function hasCompletionSignatureEvent(proposal) {
  const events = proposal?.status_detail?.signature_events;
  if (!Array.isArray(events) || events.length === 0) return false;

  return events.some((e) => {
    const type = String(e?.type || "").toLowerCase();
    return (
      type.includes("completed") ||
      type.includes("signed") ||
      type.includes("finalized")
    );
  });
}

function isSigningComplete(proposal, mode = "lenient") {
  const normalized = String(mode || "lenient").toLowerCase();

  if (normalized === "strict") {
    return hasSignedPdf(proposal) || allSignaturesCompleted(proposal);
  }

  return (
    hasSignedPdf(proposal) ||
    allSignaturesCompleted(proposal) ||
    hasCompletionSignatureEvent(proposal)
  );
}

function shouldNotify(proposal, options = {}) {
  const won = isWon(proposal, { strictStatusWonOnly: options.strictStatusWonOnly });
  const signed = isSigningComplete(proposal, options.signingMode);
  return won && signed;
}

module.exports = {
  isWon,
  isSigningComplete,
  shouldNotify,
  hasSignedPdf,
  allSignaturesCompleted,
  hasCompletionSignatureEvent
};
