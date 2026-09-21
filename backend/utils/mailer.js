/* Outgoing email without new dependencies (pure fetch).
 *
 * Provider: Resend HTTP API (https://resend.com) — 3,000 mails/month free.
 *   RESEND_API_KEY="re_..."  MAIL_FROM="Cheapflix Nepal <namaste@cheapflixnepal.live>"
 * Without a key, mails are logged server-side and (outside production) the
 * direct link is returned so flows stay testable end-to-end.
 */
async function sendMail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY || '';
  const from = process.env.MAIL_FROM || 'Cheapflix Nepal <onboarding@resend.dev>';
  if (!key) {
    console.log(`[mail] (no RESEND_API_KEY) to=${to} subject=${subject}`);
    return { sent: false, mode: 'log' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text: text || String(html || '').replace(/<[^>]+>/g, '') }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error('[mail] Resend failed:', res.status, body.slice(0, 300));
    throw new Error('Email provider rejected the message.');
  }
  return { sent: true, mode: 'resend' };
}

function resetTemplate({ name, link }) {
  return {
    subject: 'Reset your Cheapflix Nepal password',
    html: `<p>Namaste ${name || 'there'},</p><p>Someone requested a password reset for your Cheapflix Nepal account. This link works for <b>15 minutes</b>:</p><p><a href="${link}">Set a new password</a></p><p>If that button doesn't work, paste this into your browser:<br /><code>${link}</code></p><p>Didn't ask for this? Ignore the mail — your password stays the same.</p><p>— Cheapflix Nepal</p>`,
  };
}

module.exports = { sendMail, resetTemplate };
