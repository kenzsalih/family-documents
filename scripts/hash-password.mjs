import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hash-password.mjs "<your-password>"');
  console.log('Example: node scripts/hash-password.mjs "MySecretFamilyPass123"');
  process.exit(1);
}

const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);
// Next.js dotenv-expand requires $ signs to be escaped with \$
const escapedHash = hash.replace(/\$/g, '\\$');

console.log('\n--- Password Hash Generated Successfully ---');
console.log('Algorithm: bcrypt (12 rounds)');
console.log('Set this value for FAMILY_PASSWORD_HASH in your .env.local:');
console.log(`\nFAMILY_PASSWORD_HASH="${escapedHash}"\n`);
