/* Profile audit helper — writes one AuditLog row per profile edit.
 * The AuditLog table may not exist yet on older deploys (migration not run).
 * In that case we swallow the error so profile saves never break. */
const prisma = require('../config/database');

function diffFields(before, after, keys) {
  const changes = {};
  for (const k of keys) {
    const a = before ? before[k] : undefined;
    const b = after ? after[k] : undefined;
    const sa = a === null || a === undefined ? '' : String(a);
    const sb = b === null || b === undefined ? '' : String(b);
    if (sa !== sb) changes[k] = { from: sa, to: sb };
  }
  return changes;
}

async function writeAudit({ actorId, actorName, actorRole, targetUserId, targetName, action, changes }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: String(actorId || targetUserId || 'unknown'),
        actorName: actorName || null,
        actorRole: actorRole || 'user',
        targetUserId: String(targetUserId || actorId || 'unknown'),
        targetName: targetName || null,
        action: String(action || 'profile_updated'),
        changes: changes && Object.keys(changes).length ? JSON.stringify(changes).slice(0, 8000) : null,
      },
    });
  } catch (e) {
    // Table missing (migration pending) or any other issue — never fail the request.
    if (process.env.NODE_ENV !== 'production') console.warn('[audit] skipped:', e.message);
  }
}

async function readAudit({ action, search, page, limit }) {
  const where = {};
  if (action && action !== 'all') where.action = String(action);
  if (search) {
    where.OR = [
      { actorName: { contains: String(search), mode: 'insensitive' } },
      { targetName: { contains: String(search), mode: 'insensitive' } },
      { action: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  const take = Math.min(100, Math.max(1, limit || 30));
  const skip = Math.max(0, ((page || 1) - 1) * take);
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);
  return { total, rows: rows.map((r) => ({ ...r, changes: safeParse(r.changes) })), page: page || 1, totalPages: Math.ceil(total / take) };
}

function safeParse(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
}

module.exports = { diffFields, writeAudit, readAudit };
