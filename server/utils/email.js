// Shared Mailjet sender — extracted from the inline sendOTPEmail that used
// to live only in routes/auth.js, so new email flows (tenant portal
// invites) don't duplicate the request-building/error-handling logic.
async function sendEmail({ toEmail, toName, subject, html }) {
  const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: process.env.EMAIL_USER, Name: 'PropManage' },
        To: [{ Email: toEmail, Name: toName }],
        Subject: subject,
        HTMLPart: html,
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.ErrorMessage || err.message || 'Failed to send email');
  }
}

module.exports = { sendEmail };
