import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const envPath = '.env.local';
let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (!content.includes('SESSION_SECRET=')) {
  const secret = crypto.randomBytes(32).toString('hex');
  const passHash = bcrypt.hashSync('FamilyVaultPass2026!', 12);
  content += `\n# Local Auth Configuration\nSESSION_SECRET="${secret}"\nFAMILY_PASSWORD_HASH="${passHash}"\n`;
  fs.writeFileSync(envPath, content);
  console.log('Appended SESSION_SECRET and FAMILY_PASSWORD_HASH to .env.local');
} else {
  console.log('Auth secrets already present in .env.local');
}
