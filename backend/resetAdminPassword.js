const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('Missing ADMIN_PASSWORD environment variable');
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.update({
      where: {
        email: "admin@cheapflix.com"
      },
      data: {
        password: hashedPassword,
        role: "admin",
        status: "active"
      }
    });

    console.log("✅ Admin password reset done");
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();