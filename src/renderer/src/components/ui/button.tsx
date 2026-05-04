import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost:
    'hover:bg-accent hover:text-accent-foreground',
  outline:
    'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-md',
  md: 'h-9 px-4 text-sm rounded-md',
  lg: 'h-10 px-5 text-sm rounded-md',
  icon: 'h-9 w-9 rounded-md',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
