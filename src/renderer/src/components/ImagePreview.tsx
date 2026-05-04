import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon } from 'lucide-react';
import type { ThumbnailSize } from '@shared/schema';
import { cn } from '@/lib/utils';

const SIZE_PX: Record<ThumbnailSize, number> = {
  s: 28,
  m: 48,
  b: 80,
};

export function ImageThumb({
  url,
  size = 'm',
  alt,
  enableHoverPreview = true,
}: {
  url: string | null;
  size?: ThumbnailSize;
  alt?: string;
  enableHoverPreview?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const px = SIZE_PX[size];

  const onEnter = () => {
    if (!enableHoverPreview || !url || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const PREVIEW = 380;
    const margin = 8;
    let left = r.right + margin;
    if (left + PREVIEW > window.innerWidth - 8) {
      left = Math.max(8, r.left - PREVIEW - margin);
    }
    let top = r.top;
    if (top + PREVIEW > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - PREVIEW - 8);
    }
    setPos({ left, top });
  };
  const onLeave = () => setPos(null);

  return (
    <>
      <div
        ref={ref}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/40',
        )}
        style={{ width: px, height: px }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {url ? (
          <img
            src={url}
            alt={alt ?? ''}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <ImageIcon className="h-1/2 w-1/2 text-muted-foreground/60" />
        )}
      </div>
      {pos &&
        url &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[1000] rounded-lg border border-border bg-card p-1 shadow-2xl"
            style={{ left: pos.left, top: pos.top }}
          >
            <img
              src={url}
              alt={alt ?? ''}
              className="block max-h-[360px] max-w-[360px] rounded"
              draggable={false}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
