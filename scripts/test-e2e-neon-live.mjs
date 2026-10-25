import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import { SignJWT } from 'jose';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
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

const PORT = 3008;
const BASE_URL = `http://127.0.0.1:${PORT}`;

console.log('====================================================');
console.log('   END-TO-END NEON POSTGRESQL & NEXT.JS APP TEST    ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => resolve(res.statusCode));
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Next.js server failed to respond within timeout');
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
  });
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('FATAL: DATABASE_URL not found.');
    process.exit(1);
  }

  console.log('Phase 1: Direct Neon PostgreSQL Service Integration Test');
  const ssl = databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: databaseUrl, ssl });

  let testMemberId = null;
  const testMemberName = `Neon Live Test Member ${Date.now()}`;

  try {
    await client.connect();
    const connCheck = await client.query('SELECT current_database(), version();');
    assert(connCheck.rows.length === 1, `Connected to Neon database: ${connCheck.rows[0].current_database}`);

    // Insert a test member into Neon
    const insertRes = await client.query(
      'INSERT INTO family_members (name) VALUES ($1) RETURNING id, name, created_at;',
      [testMemberName]
    );
    testMemberId = insertRes.rows[0].id;
    assert(Boolean(testMemberId), `Inserted member into Neon PostgreSQL (ID: ${testMemberId})`);

    // Verify member exists in Neon
    const fetchRes = await client.query('SELECT * FROM family_members WHERE id = $1;', [testMemberId]);
    assert(fetchRes.rows.length === 1 && fetchRes.rows[0].name === testMemberName, 'Retrieved inserted member from Neon PostgreSQL');
  } catch (err) {
    console.error('Neon DB direct test error:', err.message);
    failed++;
  } finally {
    await client.end().catch(() => {});
  }

  console.log('\nPhase 2: Next.js Production Server with Neon Live Database');
  console.log(`Starting Next.js server on port ${PORT}...`);

  const server = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error') && !msg.includes('SECURITY WARNING')) {
      console.error('Server stderr:', msg.trim());
    }
  });

  try {
    await waitForServer(`${BASE_URL}/login`);
    console.log(`Next.js server is up and listening on port ${PORT}.\n`);

    // 1. Unauthenticated request to /
    const unauthRes = await httpGet(`${BASE_URL}/`);
    assert(
      unauthRes.status === 307 || unauthRes.status === 302,
      `Unauthenticated access redirected (Status: ${unauthRes.status}, Location: ${unauthRes.headers.location})`
    );

    // 2. Generate valid session cookie using SESSION_SECRET
    const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);
    const token = await new SignJWT({ authenticated: true, role: 'family_member' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secretKey);

    const authHeaders = {
      Cookie: `family_vault_session=${token}`,
    };

    // 3. Authenticated request to / (Renders member list from Neon DB)
    const homeRes = await httpGet(`${BASE_URL}/`, authHeaders);
    assert(homeRes.status === 200, `Authenticated GET / returned HTTP 200`);
    assert(
      homeRes.body.includes(testMemberName),
      `Server rendered page containing member data fetched from Neon PostgreSQL ("${testMemberName}")`
    );

    // 4. Authenticated request to /members/[id]
    const memberPageRes = await httpGet(`${BASE_URL}/members/${testMemberId}`, authHeaders);
    assert(memberPageRes.status === 200, `Authenticated GET /members/${testMemberId} returned HTTP 200`);
    assert(
      memberPageRes.body.includes(testMemberName),
      `Member detail page rendered member name from Neon PostgreSQL`
    );

  } catch (err) {
    console.error('End-to-end test error:', err.message);
    failed++;
  } finally {
    // Phase 3: Cleanup test data from Neon DB
    console.log('\nPhase 3: Database Cleanup');
    if (testMemberId) {
      const cleanupClient = new pg.Client({ connectionString: databaseUrl, ssl });
      try {
        await cleanupClient.connect();
        await cleanupClient.query('DELETE FROM family_members WHERE id = $1;', [testMemberId]);
        const verifyDeleted = await cleanupClient.query('SELECT id FROM family_members WHERE id = $1;', [testMemberId]);
        assert(verifyDeleted.rows.length === 0, 'Successfully deleted test record from Neon PostgreSQL');
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr.message);
      } finally {
        await cleanupClient.end().catch(() => {});
      }
    }

    server.kill('SIGTERM');
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
