const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log("🚀 Creating new admin...");

    const hashedPassword = await bcrypt.hash("adminpe123", 10);

    const admin = await prisma.user.upsert({
      where: {
        email: "adminpe@cheapflix.com"
      },
      update: {
        password: hashedPassword,
        role: "admin",
        status: "active"
      },
      create: {
        email: "adminpe@cheapflix.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "PE",
        role: "admin",
        status: "active"
      }
    });

    console.log("✅ Admin ready:", admin);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();