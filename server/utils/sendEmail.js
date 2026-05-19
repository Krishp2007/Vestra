const sendEmail = async (options) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY is not defined in .env');
    throw new Error('BREVO_API_KEY is missing');
  }

  const payload = {
    sender: { 
      name: process.env.FROM_NAME || 'Assets View', 
      email: process.env.FROM_EMAIL || 'noreply@assetsview.com' 
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

module.exports = sendEmail;
