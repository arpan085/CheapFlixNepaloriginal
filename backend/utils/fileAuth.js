/* Authorization for private object-storage files served via GET /api/files/<key>.
 *
 * Key layout decides the policy:
 * - avatars/*, reviews/* : public (profile + review photos render for
 *   logged-out visitors too; keys are random and unguessable).
 * - kyc/*      : owner provider or admin only.
 * - chat/*     : users involved in the related booking, or admin.
 * - anything else: denied (unknown prefix -> 404 so nothing leaks).
 *
 * Pure function of (prisma, user, key) so it can be unit-tested with a
 * stubbed prisma client. Never logs keys or user data.
 */
async function authorizeFile(prisma, user, key) {
  const sub = String(key || '').split('/')[0];
  if (sub === 'avatars' || sub === 'reviews') return { ok: true };

  if (!user) return { ok: false, status: 401, error: 'Authentication required' };
  const uid = String(user.id);
  const isAdmin = user.role === 'admin';

  if (sub === 'kyc') {
    const prov = await prisma.provider.findFirst({
      where: { documents: { contains: String(key) } },
      select: { userId: true },
    });
    if (!prov) return { ok: false, status: 404, error: 'File not found' };
    if (isAdmin || String(prov.userId) === uid) return { ok: true };
    return { ok: false, status: 403, error: 'Not allowed to view this file' };
  }

  if (sub === 'chat') {
    const msg = await prisma.message.findFirst({
      where: { attachment: { contains: String(key) } },
      include: { booking: { include: { provider: { select: { userId: true } } } } },
    });
    if (!msg || !msg.booking) return { ok: false, status: 404, error: 'File not found' };
    const providerUid = msg.booking.provider ? String(msg.booking.provider.userId) : null;
    if (isAdmin || String(msg.booking.userId) === uid || providerUid === uid) return { ok: true };
    return { ok: false, status: 403, error: 'Not allowed to view this file' };
  }

  return { ok: false, status: 404, error: 'File not found' };
}

module.exports = { authorizeFile };
