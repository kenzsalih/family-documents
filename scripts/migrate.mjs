import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if present
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set in environment or .env.local');
    process.exit(1);
  }

  const ssl = databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: databaseUrl, ssl });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully.');

    const schemaPath = path.resolve(__dirname, '../src/lib/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Applying schema migrations...');
    await client.query(sql);
    console.log('Schema applied successfully.');

    // Verify tables exist
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('family_members', 'documents');
    `);

    console.log('Verified database tables in public schema:', res.rows.map(r => r.table_name));
    if (res.rows.length >= 2) {
      console.log('Verification PASSED: family_members and documents tables are ready.');
    } else {
      console.warn('Warning: Expected 2 tables, found:', res.rows.length);
    }
  } catch (err) {
    console.error('Database migration/connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
