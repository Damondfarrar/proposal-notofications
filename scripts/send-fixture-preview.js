const { config } = require("../src/config");
const { buildFinanceEmail } = require("../src/templates");
const { Mailer } = require("../src/mailer");

async function main() {
  const proposal = {
    id: "qAPpzijfRucj",
    name: "Sample Won Proposal (Fixture Preview)",
    status: "WON",
    timestamps: { won: new Date().toISOString() },
    status_detail: {
      signed_pdf_url: "https://web.smartpricingtable.com/proposals/qAPpzijfRucj/signed"
    },
    cached_totals: { currency: "USD" },
    settings: {
      recipient: {
        name: "Example Client Co.",
        address: "123 Client Ave, Austin, TX",
        website: "https://example-client.com",
        contact: {
          name: "Client Contact",
          email: "contact@example-client.com",
          phone: "(512) 555-0110"
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
            itemName: "5-Page Website Build",
            pageName: "Main Proposal",
            sectionName: "Custom Website",
            frequency: "once",
            quantity: 1,
            lineAmountCents: 350000
          }
        ],
        totalsByFrequency: { once: 350000 }
      },
      {
        category: "SEO",
        lines: [
          {
            itemName: "SEO Growth Plan",
            pageName: "Marketing",
            sectionName: "SEO",
            frequency: "monthly",
            quantity: 1,
            lineAmountCents: 95000
          }
        ],
        totalsByFrequency: { monthly: 95000 }
      },
      {
        category: "Maintenance",
        lines: [
          {
            itemName: "Website Maintenance",
            pageName: "Support",
            sectionName: "Maintenance",
            frequency: "monthly",
            quantity: 1,
            lineAmountCents: 25000
          }
        ],
        totalsByFrequency: { monthly: 25000 }
      }
    ],
    totalsByFrequency: {
      once: 350000,
      monthly: 120000
    }
  };

  const email = buildFinanceEmail({ config, proposal, extracted });

  const mailer = new Mailer({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    user: config.smtp.user,
    pass: config.smtp.pass,
    from: config.mail.from,
    dryRun: false
  });

  const response = await mailer.send({
    to: ["damond@aaronrich.com"],
    cc: [],
    bcc: [],
    subject: `[FIXTURE PREVIEW] ${email.subject}`,
    text: email.text,
    html: email.html
  });

  console.log("Fixture preview email sent.");
  console.log("Recipient: damond@aaronrich.com");
  console.log("Subject:", `[FIXTURE PREVIEW] ${email.subject}`);
  console.log("Transport response:", response?.response || response);
  console.log("\n----- TEXT PREVIEW START -----\n");
  console.log(email.text);
  console.log("\n----- TEXT PREVIEW END -----\n");
}

main().catch((err) => {
  console.error("Failed to send fixture preview:", err);
  process.exit(1);
});
