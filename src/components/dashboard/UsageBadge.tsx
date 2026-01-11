import { cn } from '@/lib/utils';

interface UsageBadgeProps {
  current: number;
  max: number;
  label: string;
  className?: string;
}

export function UsageBadge({ current, max, label, className }: UsageBadgeProps) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn('text-xs', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-medium',
            isAtLimit && 'text-destructive',
            isNearLimit && !isAtLimit && 'text-amber-600'
          )}
        >
          {current}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isAtLimit && 'bg-destructive',
            isNearLimit && !isAtLimit && 'bg-amber-500',
            !isNearLimit && 'bg-primary'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
