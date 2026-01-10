import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');

    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          hash: true,
        },
        take: 5
      });
      console.log('\nFirst 5 users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) - hash: ${user.hash}`);
      });
    } else {
      console.log('\n⚠️  No users found in database!');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
