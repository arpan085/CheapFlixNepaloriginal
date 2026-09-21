/* SMS via Sparrow SMS HTTP API (no new deps, pure fetch).
 * Docs: https://api.sparrowsms.com/v2/sms/ — token auth.
 *   SPARROW_SMS_TOKEN="v2_..."  SPARROW_SMS_FROM="Cheapflix"
 * Without a token, OTPs are logged server-side (dev mode) so the
 * login flow stays testable without spending credits.
 */
async function sendSms({ to, text }) {
  const token = process.env.SPARROW_SMS_TOKEN || '';
  const from = process.env.SPARROW_SMS_FROM || 'Cheapflix';
  if (!token) {
    console.log(`[sms] (no SPARROW_SMS_TOKEN) to=${to} text=${text}`);
    return { sent: false, mode: 'log' };
  }
  const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token },
    body: JSON.stringify({ from, to: String(to), text: String(text) }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error('[sms] Sparrow failed:', res.status, body.slice(0, 300));
    throw new Error('SMS provider rejected the message.');
  }
  return { sent: true, mode: 'sparrow' };
}

module.exports = { sendSms };
