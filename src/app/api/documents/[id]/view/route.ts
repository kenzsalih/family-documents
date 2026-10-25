import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getDocumentById } from '@/lib/documents';
import { getFileFromStorage } from '@/lib/storage/supabase';
import { isValidUuid, formatContentDisposition } from '@/lib/security/sanitize';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return new NextResponse('Invalid document ID', { status: 400 });
  }

  // 2. Fetch document metadata
  const docResult = await getDocumentById(id);
  if (!docResult.success || !docResult.data) {
    return new NextResponse(docResult.error || 'Document not found', { status: 404 });
  }

  const doc = docResult.data;

  // 3. Fetch stream from private Supabase Storage
  const fileResult = await getFileFromStorage(doc.file_storage_key);
  if (!fileResult.success || !fileResult.data) {
    return new NextResponse(fileResult.error || 'Could not retrieve file from cloud storage', { status: 502 });
  }

  const { stream, contentType } = fileResult.data;

  // 4. Return inline stream with security headers
  const headers = new Headers();
  headers.set('Content-Type', doc.mime_type || contentType);
  headers.set('Content-Disposition', formatContentDisposition('inline', doc.original_filename));
  headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  headers.set('X-Content-Type-Options', 'nosniff');

  // Convert Node readable stream to Web ReadableStream if necessary
  const responseBody = stream instanceof ReadableStream ? stream : (stream as unknown as BodyInit);

  return new NextResponse(responseBody, {
    status: 200,
    headers,
  });
}
