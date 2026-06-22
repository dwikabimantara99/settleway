import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SettlewayLogoProps {
  compact?: boolean;
  className?: string;
  href?: string;
}

export function SettlewayLogo({
  compact = false,
  className,
  href = '/',
}: SettlewayLogoProps) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
        <Image
          src="/brand/settleway-mark.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-cover"
          priority
        />
      </span>
      {!compact ? (
        <span className="text-xl font-semibold text-[var(--navy-900)]">Settleway</span>
      ) : null}
    </>
  );

  return (
    <Link
      href={href}
      aria-label="Settleway home"
      className={cn('inline-flex items-center gap-2.5', className)}
    >
      {content}
    </Link>
  );
}
