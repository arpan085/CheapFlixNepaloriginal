const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("adminpe123", 10);

  await prisma.user.create({
    data: {
      email: "adminpe@cheapflix.com",
      password: hash,
      firstName: "Admin",
      lastName: "PE",
      role: "admin",
      status: "active"
    }
  });

  console.log("Admin created");
}

main();