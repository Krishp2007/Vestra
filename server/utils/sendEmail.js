const ejs = require('ejs');
const path = require('path');

const sendEmail = async (options) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY is not defined in .env');
    throw new Error('BREVO_API_KEY is missing');
  }

  const payload = {
    sender: { 
      name: process.env.FROM_NAME || 'Vestra Vault', 
      email: process.env.FROM_EMAIL || 'noreply@vestravault.com' 
    },
    to: [{ email: options.email }],
    subject: options.subject,
    htmlContent: options.html
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Brevo API Error:', errorData);
    throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  console.log('Message sent via Brevo API:', data.messageId);
};

const renderEmail = async (templateName, data, title = 'Vestra Vault') => {
  const templatePath = path.join(__dirname, `../templates/emails/${templateName}.ejs`);
  const body = await ejs.renderFile(templatePath, data);
  
  const layoutPath = path.join(__dirname, '../templates/emails/baseLayout.ejs');
  return await ejs.renderFile(layoutPath, {
    body,
    title
  });
};

module.exports = {
  sendEmail,
  renderEmail
};
