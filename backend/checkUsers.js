const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting...");

  const users = await prisma.user.findMany();

  console.log("Users found:");
  console.log(users);
}

main()
  .catch((err) => {
    console.error("ERROR:");
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Finished");
  });