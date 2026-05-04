import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import type { AttachmentValue } from '@shared/schema';

const dataUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(projectPath: string, relPath: string): string {
  return `${projectPath}::${relPath}`;
}

export function bumpAttachmentCache(): void {
  dataUrlCache.clear();
  inflight.clear();
}

export function attachmentDataUrlSync(
  value: AttachmentValue | null | undefined,
  projectPath: string | null,
): string | null {
  if (!value) return null;
  if (value.data) return value.data;
  if (value.path && projectPath) {
    const key = cacheKey(projectPath, value.path);
    return dataUrlCache.get(key) ?? null;
  }
  return null;
}

export function useAttachmentUrl(
  value: AttachmentValue | null | undefined,
): string | null {
  const projectPath = useProjectStore((s) => s.projectPath);
  const schema = useProjectStore((s) => s.schema);
  const [url, setUrl] = useState<string | null>(() =>
    attachmentDataUrlSync(value, projectPath),
  );

  useEffect(() => {
    if (!value) {
      setUrl(null);
      return;
    }
    if (value.data) {
      setUrl(value.data);
      return;
    }
    if (!value.path || !projectPath || !schema) {
      setUrl(null);
      return;
    }
    const key = cacheKey(projectPath, value.path);
    const cached = dataUrlCache.get(key);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    const mime = value.mime || 'application/octet-stream';
    const existing = inflight.get(key);
    const work =
      existing ??
      (async () => {
        const base64 = await window.api.readAttachment(
          projectPath,
          schema,
          value.path!,
        );
        const built = `data:${mime};base64,${base64}`;
        dataUrlCache.set(key, built);
        return built;
      })();
    if (!existing) inflight.set(key, work);
    work
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        inflight.delete(key);
      });
    return () => {
      cancelled = true;
    };
  }, [value, projectPath, schema]);

  return url;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export function isImageMime(mime: string | undefined): boolean {
  return !!mime && mime.toLowerCase().startsWith('image/');
}
