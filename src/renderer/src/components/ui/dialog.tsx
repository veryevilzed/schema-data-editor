import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: DialogProps) {
  const { t } = useI18n();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-lg border border-border bg-card text-card-foreground shadow-xl',
          'mx-4',
          sizeClasses[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 pb-4">
            <div className="flex flex-col gap-1">
              {title && <h2 className="text-base font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border p-5 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const confirm = confirmText ?? t('common.delete');
  const cancel = cancelText ?? t('common.cancel');
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            {cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors',
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {confirm}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted-foreground" />
    </Dialog>
  );
}
