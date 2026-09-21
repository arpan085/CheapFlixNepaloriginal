/* eSewa + Khalti live verification + shared payment helpers.
 *
 * Design:
 * - Format check first (offline, always available).
 * - If merchant credentials exist in env, call the live gateway API:
 *     eSewa ePay v2 status check: POST https://rc.esewa.com.np/api/epay/main/v2/status
 *       (prod: https://esewa.com.np/api/epay/main/v2/status)
 *       body: { product_code, transaction_uuid, total_amount }
 *     Khalti v2 lookup: POST https://khalti.com/api/v2/payment/verify/
 *       (sandbox: https://dev.khalti.com/api/v2/payment/verify/)
 *       body: { pidx } with Authorization: Key <secret>
 * - Without credentials we return { verified:false, mode:'format' } so the
 *   existing provider-confirms-in-their-wallet-app flow keeps working.
 *
 * Env (see .env.example):
 *   ESEWA_MERCHANT / ESEWA_SECRET_KEY / ESEWA_MODE=test|live
 *   KHALTI_SECRET_KEY / KHALTI_MODE=test|live
 */
const crypto = require('crypto');

function cfg() {
  return {
    esewaMerchant: process.env.ESEWA_MERCHANT || '',
    esewaSecret: process.env.ESEWA_SECRET_KEY || '',
    esewaMode: (process.env.ESEWA_MODE || 'test').toLowerCase() === 'live' ? 'live' : 'test',
    khaltiSecret: process.env.KHALTI_SECRET_KEY || '',
    khaltiMode: (process.env.KHALTI_MODE || 'test').toLowerCase() === 'live' ? 'live' : 'test',
  };
}

function liveCapable(method) {
  const c = cfg();
  const m = String(method || '').toLowerCase();
  if (m === 'esewa') return Boolean(c.esewaMerchant && c.esewaSecret);
  if (m === 'khalti') return Boolean(c.khaltiSecret);
  return false;
}

/* Offline reference format check (same rules the booking flow used). */
function checkWalletRef(method, ref) {
  const m = String(method || '').toLowerCase();
  if (m === 'cash') return { ok: true };
  if (!ref || String(ref).trim().length < 4) {
    return { ok: false, error: 'Enter the transaction reference from your wallet/bank app (min 4 characters).' };
  }
  const r = String(ref).trim();
  if (!/^[A-Za-z0-9\-_ ]+$/.test(r)) {
    return { ok: false, error: 'Reference can only contain letters, numbers, spaces and -_.' };
  }
  if ((m === 'esewa' || m === 'khalti') && r.replace(/\D/g, '').length < 6 && r.length < 8) {
    return { ok: false, error: 'That reference looks too short — copy the full transaction ID from your ' + m + ' history.' };
  }
  return { ok: true };
}

/* eSewa ePay v2 request signature (HMAC-SHA256, base64).
 * Signed fields: "total_amount,transaction_uuid,product_code" */
function signEsewaRequest({ totalAmount, transactionUuid }) {
  const c = cfg();
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${c.esewaMerchant}`;
  const signature = crypto.createHmac('sha256', c.esewaSecret).update(message).digest('base64');
  return { signature, signedFieldNames: 'total_amount,transaction_uuid,product_code' };
}

async function verifyEsewaLive({ totalAmount, transactionUuid }) {
  const c = cfg();
  const base = c.esewaMode === 'live'
    ? 'https://esewa.com.np/api/epay/main/v2/status'
    : 'https://rc.esewa.com.np/api/epay/main/v2/status';
  const params = new URLSearchParams({
    product_code: c.esewaMerchant,
    transaction_uuid: String(transactionUuid),
    total_amount: String(totalAmount),
  });
  const res = await fetch(`${base}?${params.toString()}`, { method: 'GET' });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 200) }; }
  if (!res.ok) return { verified: false, mode: 'esewa_api', note: 'eSewa status check failed: ' + res.status, data };
  // eSewa returns { status: 'COMPLETE' } on success.
  const st = String((data && data.status) || '').toUpperCase();
  if (st === 'COMPLETE') return { verified: true, mode: 'esewa_api', note: 'Verified with eSewa.', data };
  return { verified: false, mode: 'esewa_api', note: 'eSewa reports status: ' + (st || 'UNKNOWN'), data };
}

async function verifyKhaltiLive({ pidx }) {
  const c = cfg();
  const url = c.khaltiMode === 'live'
    ? 'https://khalti.com/api/v2/payment/verify/'
    : 'https://dev.khalti.com/api/v2/payment/verify/';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Key ' + c.khaltiSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx: String(pidx) }),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 200) }; }
  if (!res.ok) return { verified: false, mode: 'khalti_api', note: 'Khalti lookup failed: ' + res.status, data };
  const st = String((data && data.status) || '').toLowerCase();
  if (st === 'completed') return { verified: true, mode: 'khalti_api', note: 'Verified with Khalti.', data };
  return { verified: false, mode: 'khalti_api', note: 'Khalti reports status: ' + (st || 'UNKNOWN'), data };
}

/* Main entry: format check, then live API when credentials exist.
 * Returns { ok, verified, mode, note }. `ok` = reference is well-formed
 * (caller may record the claim); `verified` = gateway confirmed money. */
async function verifyPaymentRef({ method, reference, amount }) {
  const fmt = checkWalletRef(method, reference);
  if (!fmt.ok) return { ok: false, verified: false, mode: 'format', note: fmt.error };
  const m = String(method || '').toLowerCase();
  if ((m === 'esewa' || m === 'khalti') && liveCapable(m)) {
    try {
      if (m === 'esewa') {
        const r = await verifyEsewaLive({ totalAmount: amount, transactionUuid: reference });
        return { ok: r.verified || true, verified: r.verified, mode: r.mode, note: r.note };
      }
      const r = await verifyKhaltiLive({ pidx: reference });
      return { ok: r.verified || true, verified: r.verified, mode: r.mode, note: r.note };
    } catch (e) {
      return { ok: true, verified: false, mode: m === 'esewa' ? 'esewa_api' : 'khalti_api', note: 'Gateway unreachable — claim recorded, provider verifies in their app.' };
    }
  }
  return { ok: true, verified: false, mode: 'format', note: 'Format OK. Live verification activates once merchant keys are configured — provider confirms in their wallet app.' };
}

module.exports = { cfg, liveCapable, checkWalletRef, signEsewaRequest, verifyEsewaLive, verifyKhaltiLive, verifyPaymentRef };
