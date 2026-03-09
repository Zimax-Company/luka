import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default categories
  const categories = [
    { name: 'Salary', type: 'INCOME' as const },
    { name: 'Freelance', type: 'INCOME' as const },
    { name: 'Investment Returns', type: 'INCOME' as const },
    { name: 'Food', type: 'EXPENSE' as const },
    { name: 'Transportation', type: 'EXPENSE' as const },
    { name: 'Entertainment', type: 'EXPENSE' as const },
    { name: 'Utilities', type: 'EXPENSE' as const },
    { name: 'Healthcare', type: 'EXPENSE' as const },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        unique_name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {},
      create: {
        name: category.name,
        type: category.type,
      },
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
