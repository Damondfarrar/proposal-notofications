const nodemailer = require("nodemailer");

class Mailer {
  constructor({ host, port, secure, user, pass, from, dryRun = false }) {
    this.from = from;
    this.dryRun = dryRun;

    this.transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });
  }

  async send({ to, cc = [], bcc = [], subject, text, html }) {
    if (this.dryRun) {
      return {
        messageId: `dryrun-${Date.now()}`,
        accepted: Array.isArray(to) ? to : [to]
      };
    }

    const result = await this.transport.sendMail({
      from: this.from,
      to,
      cc,
      bcc,
      subject,
      text,
      html
    });

    return result;
  }
}

module.exports = { Mailer };
