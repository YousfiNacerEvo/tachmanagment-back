require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function testEmail() {
  console.log('🧪 Test rapide SendGrid...');
  
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) {
    console.log('❌ SENDGRID_FROM_EMAIL non configuré');
    return;
  }
  
  try {
    await sendEmail({
      to: fromEmail,
      subject: 'Test SendGrid - TachManager',
      html: '<h1>✅ SendGrid fonctionne!</h1>',
      text: 'SendGrid fonctionne!'
    });
    console.log('✅ Email envoyé avec succès!');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testEmail();
