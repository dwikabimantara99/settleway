import { Card, CardContent } from './Card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, description, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="mt-2 flex items-baseline gap-x-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
        </div>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </CardContent>
    </Card>
  );
}
