import { cn } from '@/lib/utils/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        {
          'bg-zinc-700 text-zinc-300': variant === 'default',
          'bg-emerald-500/20 text-emerald-400': variant === 'success',
          'bg-amber-500/20 text-amber-400': variant === 'warning',
          'bg-red-500/20 text-red-400': variant === 'error',
          'bg-blue-500/20 text-blue-400': variant === 'info',
        },
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-1 text-sm': size === 'md',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
