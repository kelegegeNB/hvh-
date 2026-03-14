import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';

// Re-implement hashing locally
const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node scripts/create_admin.js <username> <password>');
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  console.log(`Attempting to create admin user: ${username}`);

  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing) {
      console.log(`User '${username}' already exists.`);
      if (existing.role === 'ADMIN') {
        console.log('User is already an ADMIN.');
        // Optionally update password
        console.log('Updating password...');
        await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: hashPassword(password) }
        });
        console.log('✅ Password updated successfully.');
      } else {
        console.log(`User role is '${existing.role}'. Promoting to ADMIN...`);
        await prisma.user.update({
          where: { id: existing.id },
          data: { 
            role: 'ADMIN',
            passwordHash: hashPassword(password)
          }
        });
        console.log('✅ User promoted to ADMIN and password updated.');
      }
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          username,
          role: 'ADMIN',
          passwordHash: hashPassword(password),
          status: 'active'
        }
      });
      console.log('✅ Admin user created successfully.');
    }

  } catch (e) {
    console.error('❌ Error creating admin user:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
