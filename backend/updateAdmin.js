const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateAdmin() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.update({
    where: {
      email: "admin@cheapflix.com"
    },
    data: {
      password: hashedPassword,
      role: "admin"
    }
  });

  console.log("Admin updated:", admin);
}

updateAdmin();