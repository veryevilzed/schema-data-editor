import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AppDocument, Entity, ID } from '@shared/schema';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function basename(p: string): string {
  const cleaned = p.replace(/[\\/]+$/, '');
  const sep = cleaned.includes('\\') ? '\\' : '/';
  const idx = cleaned.lastIndexOf(sep);
  return idx >= 0 ? cleaned.slice(idx + 1) : cleaned;
}

export function formatId(id: unknown): string {
  if (id === null || id === undefined) return '—';
  return String(id);
}

export function isValidIdentifier(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}

export function toLocalDatetimeInput(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function todayDateInput(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function relationLabel(
  id: ID,
  target: Entity | undefined,
  targetDocs: AppDocument[],
  options: { withId?: boolean } = {},
): string {
  const doc = targetDocs.find((d) => String(d.id) === String(id));
  if (!doc) return `#${formatId(id)}`;
  if (target?.displayField && doc[target.displayField] !== undefined && doc[target.displayField] !== null) {
    const v = String(doc[target.displayField]);
    return options.withId ? `${v} (#${formatId(id)})` : v;
  }
  return `#${formatId(id)}`;
}
