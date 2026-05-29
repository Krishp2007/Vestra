const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const { sendEmail, renderEmail } = require('../utils/sendEmail');

// Simple regex check for general format
const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

// @desc    Public contact form submission
// @route   POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Advanced DNS check to prevent fake domains like gmail.oc or non-existent servers
    const domain = email.split('@')[1].toLowerCase();
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(400).json({ message: 'This email domain is not configured to receive emails.' });
      }
    } catch (err) {
      return res.status(400).json({ message: 'This email domain does not exist.' });
    }

    const ownerEmail = process.env.CONTACT_EMAIL || process.env.FROM_EMAIL || 'noreply@vestravault.com';

    // Render using the beautiful contactQuery.ejs template
    const html = await renderEmail('contactQuery', { name, email, message }, 'New Message Received');

    await sendEmail({
      email: ownerEmail,
      subject: `Vestra Contact: ${name}`,
      html,
      replyTo: { email, name } // Enables replying directly to the user who sent the inquiry!
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
