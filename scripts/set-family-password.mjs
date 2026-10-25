import fs from 'fs';
import bcrypt from 'bcryptjs';

const newPassword = process.argv[2] || 'Santana123';
const saltRounds = 12;
const hash = bcrypt.hashSync(newPassword, saltRounds);

// In Next.js, dotenv-expand treats unescaped $ signs as environment variable references
// and strips them out. Escaping them with \$ ensures Next.js loads the exact bcrypt hash.
const escapedHash = hash.replace(/\$/g, '\\$');

const envPath = '.env.local';
let content = fs.readFileSync(envPath, 'utf8');

if (content.includes('FAMILY_PASSWORD_HASH=')) {
  content = content.replace(/FAMILY_PASSWORD_HASH=.*/, `FAMILY_PASSWORD_HASH="${escapedHash}"`);
} else {
  content += `\nFAMILY_PASSWORD_HASH="${escapedHash}"\n`;
}

fs.writeFileSync(envPath, content, 'utf8');

console.log(`Password updated to: "${newPassword}"`);
console.log(`Bcrypt Hash: ${hash}`);
console.log(`Escaped for Next.js .env: ${escapedHash}`);
console.log('Direct verification:', bcrypt.compareSync(newPassword, hash));
