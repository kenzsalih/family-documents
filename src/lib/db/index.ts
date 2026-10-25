import { Pool, QueryResult, QueryResultRow } from 'pg';

export interface FamilyMember {
  id: string;
  name: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  family_member_id: string;
  name: string;
  file_storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: conn,
      ssl: conn.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
}

/**
 * Universal SQL query executor
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const p = getDbPool();
  const res: QueryResult<T> = await p.query<T>(text, params);
  return res.rows;
}
