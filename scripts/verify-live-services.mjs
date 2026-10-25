import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

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

console.log('=== LIVE CLOUD SERVICES VERIFICATION ===\n');

async function verifyDatabase() {
  console.log('1. Neon PostgreSQL Live Connection:');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('user:password@host')) {
    console.log('  ⚠️  STATUS: PENDING CONFIGURATION');
    console.log('     DATABASE_URL is not set or still contains placeholder credentials in .env.local.');
    return { verified: false, pending: true };
  }

  const ssl = databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: databaseUrl, ssl });

  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log(`  ✓ LIVE CONNECTED: Database "${res.rows[0].current_database}" on PostgreSQL`);

    // Verify tables
    const tableRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('family_members', 'documents');
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    if (tables.includes('family_members') && tables.includes('documents')) {
      console.log('  ✓ TABLES VERIFIED: family_members and documents exist in public schema.');
      return { verified: true, pending: false };
    } else {
      console.log('  ⚠️  TABLES MISSING: Run "npm run db:migrate" to apply schema.');
      return { verified: false, pending: false, needsMigration: true };
    }
  } catch (err) {
    console.error('  ✗ CONNECTION FAILED:', err.message);
    return { verified: false, pending: false, error: err.message };
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyStorage() {
  console.log('\n2. Supabase Storage Private Bucket Live Connection:');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const bucketName = process.env.SUPABASE_BUCKET_NAME || 'family documents';

  if (
    !supabaseUrl || !supabaseSecretKey ||
    supabaseUrl.includes('your-project') || supabaseSecretKey.includes('your-supabase')
  ) {
    console.log('  ⚠️  STATUS: PENDING CONFIGURATION');
    console.log('     Supabase credentials are not set or still contain placeholder values in .env.local.');
    return { verified: false, pending: true };
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testKey = `verification-tests/test-file-${Date.now()}.pdf`;
  const testPayload = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  try {
    // 1. Test Upload (allowed MIME application/pdf)
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testKey, testPayload, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    console.log(`  ✓ UPLOAD: Successfully uploaded test PDF object to bucket "${bucketName}".`);

    // 2. Test Download
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testKey);

    if (downloadError || !downloadData) {
      throw new Error(`Download failed: ${downloadError?.message || 'Empty response'}`);
    }

    const downloadedBuffer = Buffer.from(await downloadData.arrayBuffer());
    if (downloadedBuffer.equals(testPayload)) {
      console.log('  ✓ DOWNLOAD: Successfully retrieved and verified object contents.');
    } else {
      throw new Error('Downloaded bytes do not match uploaded payload.');
    }

    // 3. Test Delete
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testKey]);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }
    console.log('  ✓ DELETE: Successfully removed test object from bucket.');

    return { verified: true, pending: false };
  } catch (err) {
    console.error('  ✗ STORAGE OPERATION FAILED:', err.message);
    return { verified: false, pending: false, error: err.message };
  }
}

async function main() {
  const dbStatus = await verifyDatabase();
  const storageStatus = await verifyStorage();

  console.log('\n=================================================');
  console.log('VERIFICATION SUMMARY:');
  console.log(`- PostgreSQL Database: ${dbStatus.verified ? 'LIVE VERIFIED' : (dbStatus.pending ? 'PENDING CONFIGURATION' : 'FAILED')}`);
  console.log(`- Supabase Storage: ${storageStatus.verified ? 'LIVE VERIFIED' : (storageStatus.pending ? 'PENDING CONFIGURATION' : 'FAILED')}`);
  console.log('=================================================\n');

  if (!dbStatus.verified || !storageStatus.verified) {
    process.exitCode = 1;
  }
}

main();
