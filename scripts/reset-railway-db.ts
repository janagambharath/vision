import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Dropping public schema to reset database...');
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE;');
  console.log('Creating public schema...');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public;');
  console.log('Database reset complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });