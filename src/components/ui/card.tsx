import { cn } from '@/lib/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900 p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-lg font-semibold text-zinc-100', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-zinc-400 mt-1', className)}>{children}</p>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)}>
      {children}
    </div>
  );
}
