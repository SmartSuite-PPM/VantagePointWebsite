// Vercel serverless function: POST /api/contact
// Validates an enquiry from the contact form and emails it to the team via Resend.
// Required environment variables (set in Vercel, never in code):
//   RESEND_API_KEY       API key from resend.com
//   CONTACT_TO_EMAIL     inbox that receives enquiries
//   CONTACT_FROM_EMAIL   sender address, e.g. "Vantage Point Digital <enquiries@vantagepointdigital.uk>"

const LIMITS = {
  name: 100,
  company: 150,
  email: 200,
  phone: 40,
  stage: 60,
  message: 5000,
};

const STAGE_LABELS = {
  'due-diligence': 'Tech, data & operational due diligence',
  integration: 'Post-acquisition integration',
  'ai-transformation': 'Data & AI transformation',
  'value-creation': 'Portfolio value creation',
  'exit-readiness': 'Exit readiness',
  cyber: 'Cyber security assessment',
  'not-sure': 'Not sure yet',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

// Strip line breaks so user input can never inject extra email headers.
function singleLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid request' });
    }
  }
  body = body || {};

  // Honeypot: real visitors never fill this hidden field. Pretend success for bots.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const data = {
    name: clean(body.name, LIMITS.name),
    company: clean(body.company, LIMITS.company),
    email: clean(body.email, LIMITS.email),
    phone: clean(body.phone, LIMITS.phone),
    stage: clean(body.stage, LIMITS.stage),
    message: clean(body.message, LIMITS.message),
  };

  if (!data.name || !data.company || !data.email || !data.message) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }
  if (!EMAIL_PATTERN.test(data.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error('Contact form: missing environment variables');
    return res.status(500).json({ error: 'The form is not configured yet.' });
  }

  const stageLabel = STAGE_LABELS[data.stage] || 'Not specified';
  const subject = `New enquiry from ${singleLine(data.name)} (${singleLine(data.company)})`;

  const text = [
    `Name: ${data.name}`,
    `Company / fund: ${data.company}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || 'Not provided'}`,
    `Lifecycle stage: ${stageLabel}`,
    '',
    'Message:',
    data.message,
  ].join('\n');

  const html = `
    <h2 style="font-family:Arial,sans-serif">New website enquiry</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 16px 4px 0"><strong>Name</strong></td><td>${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0"><strong>Company / fund</strong></td><td>${escapeHtml(data.company)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0"><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0"><strong>Phone</strong></td><td>${escapeHtml(data.phone || 'Not provided')}</td></tr>
      <tr><td style="padding:4px 16px 4px 0"><strong>Lifecycle stage</strong></td><td>${escapeHtml(stageLabel)}</td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:14px"><strong>Message</strong></p>
    <p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(data.message)}</p>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: data.email,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Contact form: Resend error', response.status, detail);
      return res.status(502).json({ error: 'We could not send your message. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form: unexpected error', err);
    return res.status(502).json({ error: 'We could not send your message. Please try again.' });
  }
};
