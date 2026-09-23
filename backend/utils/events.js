/* Tiny live-event hub for Server-Sent Events (zero new deps).
 * Controllers call `emitTo(userId, event, data)` after creating
 * notifications / messages; connected browsers subscribed at
 * GET /api/stream receive them instantly instead of polling.
 * Falls back gracefully — polling code in the app keeps working.
 */
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(200);

// userId -> Set<res>
const clients = new Map();

function subscribe(userId, res) {
  const id = String(userId);
  if (!clients.has(id)) clients.set(id, new Set());
  const set = clients.get(id);
  // Cap connections per user so tabs left open can't leak memory.
  if (set.size >= 5) {
    try { res.write(': dropped: too many tabs\n\n'); } catch (e) {}
    try { res.end(); } catch (e) {}
    return;
  }
  set.add(res);
  res.on('close', () => {
    const s = clients.get(id);
    if (s) {
      s.delete(res);
      if (!s.size) clients.delete(id);
    }
  });
}

function live(res) {
  return res && !res.writableEnded && !res.destroyed;
}

function emitTo(userId, event, data) {
  const set = clients.get(String(userId));
  bus.emit('event', { userId: String(userId), event, data });
  if (!set || !set.size) return 0;
  let n = 0;
  for (const res of [...set]) {
    if (!live(res)) { set.delete(res); continue; }
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`);
      n++;
    } catch (e) { set.delete(res); /* dead connection */ }
  }
  return n;
}

/* Broadcast to EVERY connected browser (all users + admins).
 * Used for profile updates so public cards, detail pages, bookings,
 * chat headers and admin tables refresh instantly instead of
 * waiting for a reload or a 15s HTTP cache to expire. */
function broadcast(event, data) {
  bus.emit('event', { userId: '*', event, data });
  let n = 0;
  for (const [, set] of clients) {
    for (const res of [...set]) {
      if (!live(res)) { set.delete(res); continue; }
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`);
        n++;
      } catch (e) { set.delete(res); }
    }
  }
  return n;
}

function heartbeat() {
  for (const [id, set] of clients) {
    for (const res of [...set]) {
      if (!live(res)) { set.delete(res); continue; }
      try { res.write(': ping\n\n'); } catch (e) { set.delete(res); }
    }
    if (!set.size) clients.delete(id);
  }
}
setInterval(heartbeat, 25000).unref();

module.exports = { subscribe, emitTo, broadcast, bus, clientCount: () => clients.size };
