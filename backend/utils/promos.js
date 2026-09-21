/* Promos + referrals without a DB table.
   - Static codes below (edit freely, or move to env/DB later).
   - Referral codes are derived: REF-<last 6 of referrer id>.
   - First-booking enforcement uses a live booking count.
   Pricing rule (must match frontend estimate): hourly × hours + 5% fee. */
const STATIC_PROMOS = [
  { code: 'WELCOME10', type: 'pct', value: 10, maxOff: 500, minTotal: 500, label: '10% off up to Rs 500' },
  { code: 'NAMASTE200', type: 'flat', value: 200, firstBookingOnly: true, label: 'Rs 200 off your first booking' },
];

const FEE_RATE = 0.05;

function hoursFromDuration(duration) {
  const m = /(\d+(?:\.\d+)?)/.exec(String(duration || ''));
  const h = m ? Number(m[1]) : 0;
  return h > 0 && h <= 24 ? h : 0;
}

function expectedTotal(hourly, duration) {
  const hours = hoursFromDuration(duration);
  if (!hourly || !hours) return null;
  const base = Number(hourly) * hours;
  return base + Math.round(base * FEE_RATE);
}

function refCodeFor(userId) {
  return 'REF-' + String(userId).slice(-6).toUpperCase();
}

async function priorBookings(prisma, userId) {
  return prisma.booking.count({ where: { userId: String(userId) } });
}

// Returns { ok, discount, reason, promo } — discount in Rs.
async function validatePromo(prisma, { code, userId, subtotal }) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { ok: false, discount: 0, reason: 'Enter a promo code.' };
  const sub = Number(subtotal) || 0;

  // 1) Admin-managed codes from the DB (skipped until migrated).
  try {
    const row = await prisma.promoCode.findUnique({ where: { code: clean } });
    if (row) {
      if (!row.active) return { ok: false, discount: 0, reason: `${clean} is no longer active.` };
      if (row.expiresAt && row.expiresAt < new Date()) return { ok: false, discount: 0, reason: `${clean} has expired.` };
      if (row.usageLimit != null && row.usedCount >= row.usageLimit) return { ok: false, discount: 0, reason: `${clean} is fully claimed.` };
      if (sub < (row.minTotal || 0)) return { ok: false, discount: 0, reason: `${clean} needs a minimum of ${row.minTotal}.` };
      if (row.firstBookingOnly) {
        const n = await priorBookings(prisma, userId);
        if (n > 0) return { ok: false, discount: 0, reason: `${clean} is for first bookings only.` };
      }
      const discount = row.type === 'pct'
        ? Math.min(Math.round((sub * row.value) / 100), row.maxOff || Infinity)
        : Math.min(row.value, sub);
      return { ok: true, discount, promo: { code: row.code, label: row.label }, dbPromo: true };
    }
  } catch (e) { /* PromoCode table not migrated — fall through to static codes */ }

  const applyStatic = async (promo) => {
    if (promo.minTotal && sub < promo.minTotal) {
      return { ok: false, discount: 0, reason: `${promo.code} needs a minimum of ${promo.minTotal}.` };
    }
    if (promo.firstBookingOnly) {
      const n = await priorBookings(prisma, userId);
      if (n > 0) return { ok: false, discount: 0, reason: `${promo.code} is for first bookings only.` };
    }
    const discount = promo.type === 'pct'
      ? Math.min(Math.round((sub * promo.value) / 100), promo.maxOff || Infinity)
      : Math.min(promo.value, sub);
    return { ok: true, discount, promo };
  };

  const found = STATIC_PROMOS.find((p) => p.code === clean);
  if (found) return applyStatic(found);

  if (clean.startsWith('REF-') && clean.length === 10) {
    const suffix = clean.slice(4).toLowerCase();
    const referrer = await prisma.user.findFirst({ where: { id: { endsWith: suffix } }, select: { id: true } });
    if (!referrer) return { ok: false, discount: 0, reason: 'Referral code not recognised.' };
    if (referrer.id === String(userId)) return { ok: false, discount: 0, reason: 'You cannot use your own referral code.' };
    const n = await priorBookings(prisma, userId);
    if (n > 0) return { ok: false, discount: 0, reason: 'Referral credit is for first bookings only.' };
    return { ok: true, discount: Math.min(200, sub), promo: { code: clean, label: 'Rs 200 referral credit' }, referrerId: referrer.id };
  }

  return { ok: false, discount: 0, reason: 'Code not recognised. Try WELCOME10.' };
}

/* Increment usage after a booking succeeds with a DB-managed code. */
async function recordPromoUse(prisma, code) {
  try {
    await prisma.promoCode.update({
      where: { code: String(code).trim().toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  } catch (e) { /* static code or table missing — nothing to count */ }
}

module.exports = { STATIC_PROMOS, FEE_RATE, hoursFromDuration, expectedTotal, refCodeFor, validatePromo, recordPromoUse };
