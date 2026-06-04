function centsToCurrency(cents, currency = "USD") {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "";
  const value = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);
}

function normalizeToCents(rawValue, unitMode = "auto") {
  if (typeof rawValue !== "number" || Number.isNaN(rawValue)) return null;

  const mode = String(unitMode || "auto").toLowerCase();

  if (mode === "cents") return Math.round(rawValue);
  if (mode === "dollars") return Math.round(rawValue * 100);

  // auto mode heuristic:
  // - decimals are typically dollars (e.g. 1.2 => $1.20)
  // - large integers are typically cents (e.g. 125000 => $1,250.00)
  // - small integers are treated as dollars to avoid tiny totals (e.g. 120 => $120.00)
  if (!Number.isInteger(rawValue)) return Math.round(rawValue * 100);
  if (Math.abs(rawValue) >= 1000) return Math.round(rawValue);
  return Math.round(rawValue * 100);
}

function deriveCategory(sectionName = "") {
  const name = String(sectionName).toLowerCase();
  if (name.includes("website") || name.includes("custom website")) return "Website Development";
  if (name.includes("social")) return "Social Media";
  if (name.includes("seo")) return "SEO";
  if (name.includes("advert")) return "Online Advertising";
  if (name.includes("maintenance")) return "Maintenance";
  if (name.includes("hourly")) return "Hourly Services";
  return sectionName || "Other Services";
}

function readPrice(price = {}, options = {}) {
  const model = price?.model || "none";
  const frequency = price?.frequency || "once";
  const quantityCurrent = typeof price?.quantity?.current === "number" ? price.quantity.current : 1;
  const quantity = quantityCurrent > 0 ? quantityCurrent : 1;

  if (model === "none") {
    return { include: false, model, frequency, quantity };
  }

  if (model === "fixed" || model === "hourly") {
    const unitCents = normalizeToCents(Number(price?.value || 0), options.priceUnitMode);
    if (unitCents === null) return { include: false, model, frequency, quantity };
    const lineCents = unitCents * quantity;
    return {
      include: true,
      model,
      frequency,
      quantity,
      unitAmountCents: unitCents,
      lineAmountCents: lineCents,
      display: centsToCurrency(lineCents)
    };
  }

  if (model === "percent") {
    const pct = Number(price?.value || 0);
    return {
      include: true,
      model,
      frequency,
      quantity,
      unitAmountCents: null,
      lineAmountCents: null,
      display: `${(pct * 100).toFixed(2)}%`
    };
  }

  if (model === "text") {
    return {
      include: true,
      model,
      frequency,
      quantity,
      unitAmountCents: null,
      lineAmountCents: null,
      display: "Text-based pricing"
    };
  }

  return { include: false, model, frequency, quantity };
}

function pushLine(lines, input) {
  lines.push({
    category: input.category || "Other Services",
    pageName: input.pageName || "",
    sectionName: input.sectionName || "",
    itemName: input.itemName || "",
    frequency: input.frequency || "once",
    quantity: input.quantity ?? 1,
    unitAmountCents: input.unitAmountCents ?? null,
    lineAmountCents: input.lineAmountCents ?? null,
    displayAmount: input.displayAmount || "",
    meta: input.meta || {}
  });
}

function extractFromLineItem(lines, lineItem, context, options = {}) {
  if (lineItem?.isSelected !== true) return;

  const pricing = readPrice(lineItem?.price || {}, options);
  if (!pricing.include) return;

  const category = deriveCategory(context.sectionName);
  pushLine(lines, {
    category,
    pageName: context.pageName,
    sectionName: context.sectionName,
    itemName: lineItem?.name || "Unnamed item",
    frequency: pricing.frequency,
    quantity: pricing.quantity,
    unitAmountCents: pricing.unitAmountCents,
    lineAmountCents: pricing.lineAmountCents,
    displayAmount: pricing.display,
    meta: { model: pricing.model, source: "line_item" }
  });

  const children = Array.isArray(lineItem?.children) ? lineItem.children : [];
  for (const mod of children) {
    if (mod?.isSelected !== true) continue;
    const modPricing = readPrice(mod?.price || {}, options);
    if (!modPricing.include) continue;

    pushLine(lines, {
      category,
      pageName: context.pageName,
      sectionName: context.sectionName,
      itemName: `${lineItem?.name || "Item"} → ${mod?.name || "Modification"}`,
      frequency: modPricing.frequency,
      quantity: modPricing.quantity,
      unitAmountCents: modPricing.unitAmountCents,
      lineAmountCents: modPricing.lineAmountCents,
      displayAmount: modPricing.display,
      meta: { model: modPricing.model, source: "modification" }
    });
  }
}

function extractFromGroup(lines, group, context, options = {}) {
  const sectionName = group?.name || context.sectionName || "Group";
  const lineItems = Array.isArray(group?.lineItems) ? group.lineItems : [];
  for (const lineItem of lineItems) {
    extractFromLineItem(
      lines,
      lineItem,
      {
        pageName: context.pageName,
        sectionName
      },
      options
    );
  }
}

function extractFromSideBySide(lines, sideBySide, context, options = {}) {
  const sectionName = sideBySide?.name || context.sectionName || "Option Set";
  const category = deriveCategory(sectionName);
  const columns = Array.isArray(sideBySide?.columns) ? sideBySide.columns : [];

  for (const col of columns) {
    if (col?.isSelected !== true) continue;

    const frequency = col?.frequency || "once";
    const quantity = typeof col?.quantity?.current === "number" ? col.quantity.current : 1;
    const unitCents = normalizeToCents(
      typeof col?.price === "number" ? col.price : null,
      options.priceUnitMode
    );
    if (unitCents === null) continue;

    const lineAmountCents = unitCents * quantity;

    pushLine(lines, {
      category,
      pageName: context.pageName,
      sectionName,
      itemName: `${sectionName} → ${col?.name || "Selected option"}`,
      frequency,
      quantity,
      unitAmountCents: unitCents,
      lineAmountCents,
      displayAmount: centsToCurrency(lineAmountCents),
      meta: { model: "side_by_side", source: "side_by_side_column" }
    });
  }
}

function buildGrouped(lines) {
  const groupedMap = new Map();

  for (const line of lines) {
    const key = line.category || "Other Services";
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        category: key,
        lines: [],
        totalsByFrequency: {}
      });
    }

    const group = groupedMap.get(key);
    group.lines.push(line);

    if (typeof line.lineAmountCents === "number") {
      const freq = line.frequency || "once";
      group.totalsByFrequency[freq] = (group.totalsByFrequency[freq] || 0) + line.lineAmountCents;
    }
  }

  return Array.from(groupedMap.values());
}

function extractSelectedServices(proposal, options = {}) {
  const pages = Array.isArray(proposal?.pages) ? proposal.pages : [];
  const lines = [];

  for (const page of pages) {
    const pageName = page?.name || "Untitled Page";
    const children = Array.isArray(page?.children) ? page.children : [];

    for (const child of children) {
      const kind = child?.kind;
      if (kind === "group") {
        extractFromGroup(lines, child, { pageName, sectionName: child?.name || "Group" }, options);
      } else if (kind === "side_by_side") {
        extractFromSideBySide(lines, child, { pageName, sectionName: child?.name || "Option Set" }, options);
      } else if (Array.isArray(child?.lineItems)) {
        extractFromGroup(lines, child, { pageName, sectionName: child?.name || "Group" }, options);
      }
    }
  }

  const totalsByFrequency = lines.reduce((acc, line) => {
    const freq = line.frequency || "once";
    const amount = typeof line.lineAmountCents === "number" ? line.lineAmountCents : 0;
    acc[freq] = (acc[freq] || 0) + amount;
    return acc;
  }, {});

  const grouped = buildGrouped(lines);

  return {
    lines,
    grouped,
    totalsByFrequency
  };
}

module.exports = {
  extractSelectedServices,
  centsToCurrency
};
