const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log("🚀 Starting admin creation...");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.create({
      data: {
        email: "admin@cheapflix.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        status: "active"
      }
    });

    console.log("✅ Admin created successfully:");
    console.log(admin);

  } catch (error) {
    console.error("❌ Error creating admin:");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();