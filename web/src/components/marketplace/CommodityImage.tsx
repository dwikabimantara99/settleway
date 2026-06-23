'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getCommodityImage(commodity: string): string {
  const normalized = commodity.toLowerCase();
  if (normalized.includes('coffee') || normalized.includes('arabica') || normalized.includes('beans')) {
    return '/commodities/green-coffee.png';
  }
  if (normalized.includes('rice')) return '/commodities/white-rice.png';
  return '/commodities/red-chili.png';
}

export function CommodityImage({
  commodity,
  className,
  sizes,
  priority = false,
}: {
  commodity: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${commodity} image unavailable`}
        className={cn(
          'flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[var(--navy-50)] to-[var(--green-50)] text-[var(--text-muted)]',
          className,
        )}
      >
        <ImageOff className="h-8 w-8" />
        <span className="mt-2 text-xs font-semibold">Image unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={getCommodityImage(commodity)}
      alt={commodity}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
