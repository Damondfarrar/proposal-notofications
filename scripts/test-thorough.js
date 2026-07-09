const { extractSelectedServices, centsToCurrency } = require("../src/serviceExtractor");
const { buildFinanceEmail } = require("../src/templates");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function runExtractorTests() {
  // Case 1: strict selected-only + exclude model:none + quantity math + grouping
  const proposal = {
    id: "test-1",
    pages: [
      {
        name: "Main Page",
        children: [
          {
            kind: "group",
            name: "Custom Website Services",
            lineItems: [
              {
                isSelected: true,
                name: "Website Build",
                price: { model: "fixed", frequency: "once", value: 2500, quantity: { current: 1 } }
              },
              {
                isSelected: false,
                name: "Not Selected",
                price: { model: "fixed", frequency: "once", value: 999, quantity: { current: 1 } }
              },
              {
                isSelected: true,
                name: "No Price Item",
                price: { model: "none", frequency: "once", value: 0, quantity: { current: 1 } }
              }
            ]
          },
          {
            kind: "group",
            name: "SEO Plan",
            lineItems: [
              {
                isSelected: true,
                name: "SEO Monthly",
                price: { model: "hourly", frequency: "monthly", value: 120, quantity: { current: 2 } }
              }
            ]
          },
          {
            kind: "side_by_side",
            name: "Maintenance Options",
            columns: [
              { isSelected: true, name: "Standard", frequency: "monthly", quantity: { current: 1 }, price: 75, priceModel: "fixed" },
              { isSelected: false, name: "Premium", frequency: "monthly", quantity: { current: 1 }, price: 120, priceModel: "fixed" },
              { isSelected: true, name: "No Price", frequency: "monthly", quantity: { current: 1 }, price: 0, priceModel: "none" }
            ]
          }
        ]
      }
    ]
  };

  const extractedAuto = extractSelectedServices(proposal, { priceUnitMode: "auto" });

  assertEqual(extractedAuto.lines.length, 3, "Should include only selected numeric priced rows.");
  const names = extractedAuto.lines.map((l) => l.itemName);
  assert(names.includes("Website Build"), "Website Build missing");
  assert(names.includes("SEO Monthly"), "SEO Monthly missing");
  assert(names.includes("Maintenance Options → Standard"), "Selected side-by-side option missing");

  // auto mode: 2500 interpreted as cents (>=1000 integer) => $25.00
  // 120 interpreted as dollars (<1000 integer) => $120.00 each * 2 = $240.00
  // 75 interpreted as dollars => $75.00
  assertEqual(extractedAuto.totalsByFrequency.once, 2500, "Once total mismatch in auto mode.");
  assertEqual(extractedAuto.totalsByFrequency.monthly, 31500, "Monthly total mismatch in auto mode.");

  const websiteGroup = extractedAuto.grouped.find((g) => g.category === "Website Development");
  const seoGroup = extractedAuto.grouped.find((g) => g.category === "SEO");
  const maintenanceGroup = extractedAuto.grouped.find((g) => g.category === "Maintenance");

  assert(websiteGroup, "Website group missing.");
  assert(seoGroup, "SEO group missing.");
  assert(maintenanceGroup, "Maintenance group missing.");

  assertEqual(websiteGroup.totalsByFrequency.once, 2500, "Website group subtotal mismatch.");
  assertEqual(seoGroup.totalsByFrequency.monthly, 24000, "SEO group subtotal mismatch.");
  assertEqual(maintenanceGroup.totalsByFrequency.monthly, 7500, "Maintenance group subtotal mismatch.");

  // Case 2: cents mode normalization
  const proposalCents = {
    pages: [
      {
        name: "P",
        children: [
          {
            kind: "group",
            name: "Hourly Services",
            lineItems: [
              {
                isSelected: true,
                name: "Block",
                price: { model: "hourly", frequency: "once", value: 12500, quantity: { current: 2 } }
              }
            ]
          }
        ]
      }
    ]
  };
  const extractedCents = extractSelectedServices(proposalCents, { priceUnitMode: "cents" });
  assertEqual(extractedCents.totalsByFrequency.once, 25000, "Cents mode total mismatch.");

  // Case 3: dollars mode normalization
  const proposalDollars = {
    pages: [
      {
        name: "P",
        children: [
          {
            kind: "group",
            name: "Social Growth",
            lineItems: [
              {
                isSelected: true,
                name: "Plan",
                price: { model: "fixed", frequency: "monthly", value: 199.99, quantity: { current: 1 } }
              }
            ]
          }
        ]
      }
    ]
  };
  const extractedDollars = extractSelectedServices(proposalDollars, { priceUnitMode: "dollars" });
  assertEqual(extractedDollars.totalsByFrequency.monthly, 19999, "Dollars mode total mismatch.");
}

function runTemplateTests() {
  const config = {
    app: { proposalAppUrlBase: "https://app.example.com" }
  };

  const proposal = {
    id: "qAPpzijfRucj",
    name: "Finance Preview Proposal",
    cached_totals: { currency: "USD" },
    timestamps: { won: "2026-06-15T10:00:00.000Z" },
    status_detail: { signed_pdf_url: "https://files.example.com/signed.pdf" },
    settings: {
      recipient: {
        name: "Acme Corp",
        address: "123 Main St",
        website: "https://acme.example",
        contact: {
          name: "Jane Doe",
          email: "jane@acme.example",
          phone: "555-0101"
        }
      }
    }
  };

  const extracted = {
    grouped: [
      {
        category: "Website Development",
        lines: [
          {
            itemName: "Website Build",
            pageName: "Main",
            sectionName: "Custom Website",
            frequency: "once",
            quantity: 1,
            lineAmountCents: 125000
          }
        ],
        totalsByFrequency: { once: 125000 }
      },
      {
        category: "SEO",
        lines: [
          {
            itemName: "SEO Plan",
            pageName: "Growth",
            sectionName: "SEO",
            frequency: "monthly",
            quantity: 1,
            lineAmountCents: 45000
          }
        ],
        totalsByFrequency: { monthly: 45000 }
      }
    ],
    totalsByFrequency: { once: 125000, monthly: 45000 }
  };

  const email = buildFinanceEmail({ config, proposal, extracted });

  assert(email.subject.includes("Finance Preview Proposal"), "Subject missing proposal name.");
  assert(email.text.includes("Website Development"), "Text missing group heading.");
  assert(email.text.includes("SEO"), "Text missing SEO group.");
  assert(email.text.includes("Subtotal"), "Text missing subtotal section.");
  assert(email.text.includes("once: $1,250.00"), "Text missing overall once total.");
  assert(email.text.includes("monthly: $450.00"), "Text missing overall monthly total.");

  assert(email.html.includes("<h4>Website Development</h4>"), "HTML missing website group heading.");
  assert(email.html.includes("<h4>SEO</h4>"), "HTML missing SEO heading.");
  assert(email.html.includes("<strong>Subtotal</strong>"), "HTML missing subtotal label.");
  assert(email.html.includes("$1,250.00"), "HTML missing once formatted amount.");
  assert(email.html.includes("$450.00"), "HTML missing monthly formatted amount.");

  // smoke for helper export behavior
  assertEqual(centsToCurrency(12345, "USD"), "$123.45", "Currency formatter mismatch.");
}

function run() {
  runExtractorTests();
  runTemplateTests();
  console.log("PASS: thorough local test suite completed.");
}

run();
