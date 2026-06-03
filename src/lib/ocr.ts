import { supabase, isSupabaseConfigured } from './supabase/client';

/**
 * OCR a Thai car-maintenance receipt by proxying the image through the
 * `ocr-receipt` Supabase Edge Function, which calls Anthropic's Claude
 * vision API server-side.
 *
 * The Anthropic API key never leaves the Supabase project. The browser
 * never sees it. supabase.functions.invoke() automatically attaches the
 * user's JWT, so RLS-style auth on the edge function "just works".
 *
 * Setup (one-time, per Supabase project):
 *   supabase functions deploy ocr-receipt
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

export interface OcrItem {
  partName: string;
  quantity: number;
  unitPrice: number;
}

interface OcrResponse {
  items?: OcrItem[];
  error?: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // FileReader gives a "data:<mime>;base64,<...>" URL — keep only the data.
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('FileReader returned no comma'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function ocrReceipt(blob: Blob): Promise<OcrItem[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase ยังไม่ได้ตั้งค่า');
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('โปรดเข้าสู่ระบบใหม่');
  }

  const imageBase64 = await blobToBase64(blob);

  const { data, error } = await supabase.functions.invoke<OcrResponse>('ocr-receipt', {
    body: {
      imageBase64,
      mimeType: blob.type || 'image/jpeg',
    },
  });

  if (error) {
    // FunctionsHttpError has a `context` Response we can read for the body.
    const msg = error.message ?? String(error);
    throw new Error(msg);
  }
  if (!data || data.error) {
    throw new Error(data?.error ?? 'OCR ไม่สำเร็จ');
  }
  return data.items ?? [];
}
