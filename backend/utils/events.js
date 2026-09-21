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
  clients.get(id).add(res);
  res.on('close', () => {
    const set = clients.get(id);
    if (set) {
      set.delete(res);
      if (!set.size) clients.delete(id);
    }
  });
}

function emitTo(userId, event, data) {
  const set = clients.get(String(userId));
  bus.emit('event', { userId: String(userId), event, data });
  if (!set || !set.size) return 0;
  let n = 0;
  for (const res of set) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`);
      n++;
    } catch (e) { /* dead connection; cleanup on close */ }
  }
  return n;
}

function heartbeat() {
  for (const set of clients.values()) {
    for (const res of set) {
      try { res.write(': ping\n\n'); } catch (e) {}
    }
  }
}
setInterval(heartbeat, 25000).unref();

module.exports = { subscribe, emitTo, bus, clientCount: () => clients.size };
