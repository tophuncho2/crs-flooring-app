const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10)

  await prisma.user.create({
    data: {
      email: "admin@test.com",
      password: hashedPassword
    }
  })

  console.log("User created.")
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())