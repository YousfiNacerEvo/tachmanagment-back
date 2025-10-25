const sgMail = require('@sendgrid/mail');

// ENV expected:
// SENDGRID_API_KEY, SENDGRID_FROM_EMAIL

// Initialize SendGrid
function initializeSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  
  if (!apiKey || !fromEmail) {
    console.warn('[emailService] SendGrid not configured; SENDGRID_API_KEY and SENDGRID_FROM_EMAIL required');
    return false;
  }
  
  sgMail.setApiKey(apiKey);
  console.log('[emailService] SendGrid initialized successfully');
  return true;
}

const isSendGridConfigured = initializeSendGrid();

async function sendEmail({ to, subject, text, html }) {
  if (!isSendGridConfigured) {
    console.log('[emailService] Skipping email (SendGrid not configured)', { to, subject });
    return { skipped: true };
  }

  const from = process.env.SENDGRID_FROM_EMAIL;
  
  // Handle multiple recipients (array of emails)
  const recipients = Array.isArray(to) ? to : [to];
  
  try {
    const msg = {
      to: recipients,
      from: from,
      subject: subject,
      text: text,
      html: html,
    };

    const response = await sgMail.send(msg);
    console.log('[emailService] Email sent successfully:', { to: recipients, subject, statusCode: response[0].statusCode });
    return response;
  } catch (err) {
    console.error('[emailService] SendGrid error:', err);
    
    // Handle specific SendGrid errors
    if (err.response) {
      const { statusCode, body } = err.response;
      console.error('[emailService] SendGrid API error:', { statusCode, body });
    }
    
    return Promise.reject(err);
  }
}

module.exports = { sendEmail };