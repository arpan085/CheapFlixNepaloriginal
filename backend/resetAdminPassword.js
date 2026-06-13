const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

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