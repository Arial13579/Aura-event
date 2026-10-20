import 'server-only';
import { firebaseConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RestValue = Record<string, any>;

function decode(v: RestValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  return null;
}

function decodeFields(fields: Record<string, RestValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
  return out;
}

/** Reads a publicly readable document through the Firestore REST API (used for server rendering). */
export async function getPublicDoc(path: string): Promise<Record<string, unknown> | null> {
  const { projectId, apiKey } = firebaseConfig;
  if (!projectId) return null;
  const host = process.env.NEXT_PUBLIC_USE_EMULATOR === '1' ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
  const url = `${host}/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return decodeFields(json.fields || {});
  } catch {
    return null;
  }
}
