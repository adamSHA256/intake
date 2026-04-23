export type Cursor = { created_at: string; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.created_at}|${c.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(s: string): Cursor | null {
  try {
    const raw = Buffer.from(s, 'base64url').toString('utf8');
    const sep = raw.indexOf('|');
    if (sep <= 0) return null;
    const created_at = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    if (!created_at || !id) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}
