const nodemailer = require('nodemailer');

// ENV expected:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

function createTransport() {
  const service = (process.env.SMTP_SERVICE || '').toLowerCase();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const insecureTls = String(process.env.SMTP_TLS_INSECURE || '').toLowerCase() === '1' || String(process.env.SMTP_TLS_INSECURE || '').toLowerCase() === 'true';
  const tls = insecureTls ? { rejectUnauthorized: false } : undefined;
  if (service === 'gmail') {
    if (!user || !pass) {
      console.warn('[emailService] Gmail selected but SMTP_USER/SMTP_PASS missing');
      return null;
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls,
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      socketTimeout: 20000,
      connectionTimeout: 20000,
    });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host || !user || !pass) {
    console.warn('[emailService] SMTP not configured; emails will be no-op');
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    socketTimeout: 20000,
    connectionTimeout: 20000,
  });
}

const transport = createTransport();

async function sendEmail({ to, subject, text, html }) {
  if (!transport) {
    console.log('[emailService] Skipping email (transport not configured)', { to, subject });
    return { skipped: true };
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  try {
    return await transport.sendMail({ from, to, subject, text, html });
  } catch (err) {
    const code = (err && err.code) || '';
    if (['ESOCKET', 'ETIMEDOUT', 'ECONNRESET'].includes(String(code))) {
      try {
        await new Promise(r => setTimeout(r, 500));
        return await transport.sendMail({ from, to, subject, text, html });
      } catch (e2) {
        console.warn('[emailService] send retry failed:', e2?.message || e2);
        return Promise.reject(e2);
      }
    }
    return Promise.reject(err);
  }
}

module.exports = { sendEmail };


