const { PrismaClient } = require('@prisma/client');

// Query logging is a major CPU/IO overhead — dev only.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
});

module.exports = prisma;
