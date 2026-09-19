/**
 * Corroborate Logo Component
 *
 * A balance-scale medallion: a solid fulcrum triangle, a rotating beam with
 * two pans in two different tones (symbolizing two independent sources on
 * one scale), inside a thin instrument-blue ring.
 *
 * Variants:
 * - "full": Mark + Wordmark, nameplate-style (for desktop/larger spaces)
 * - "mark": Mark only (for mobile/compact spaces)
 * - "wordmark": Wordmark only
 */

import React from 'react';

export type LogoVariant = 'full' | 'mark' | 'wordmark';
export type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}

const sizeMap = {
  sm: { mark: 24, text: 'text-sm', sub: true },
  md: { mark: 32, text: 'text-base', sub: true },
  lg: { mark: 40, text: 'text-lg', sub: true },
};

function ScaleMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Corroborate"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="15" fill="none" stroke="var(--primary)" strokeWidth="1.6" />
      <path d="M16 11.5 L20.5 22.5 L11.5 22.5 Z" fill="var(--foreground)" />
      <line x1="10" y1="23" x2="22" y2="23" stroke="var(--foreground)" strokeWidth="1.8" strokeLinecap="round" />
      <g transform="rotate(-6 16 11.5)">
        <line x1="6" y1="11.5" x2="26" y2="11.5" stroke="var(--foreground)" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="6" y1="11.5" x2="6" y2="15.5" stroke="var(--foreground)" strokeWidth="1.2" />
        <line x1="26" y1="11.5" x2="26" y2="15.5" stroke="var(--foreground)" strokeWidth="1.2" />
        <ellipse cx="6" cy="17.3" rx="4.2" ry="2.4" fill="var(--primary)" />
        <ellipse cx="26" cy="17.3" rx="4.2" ry="2.4" fill="var(--foreground)" />
      </g>
      <circle cx="16" cy="11.5" r="1.7" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const { mark: markSize, text: textSize } = sizeMap[size];

  const Wordmark = () => (
    <div className="leading-none">
      <span
        className={`${textSize} font-semibold uppercase text-foreground font-[family-name:var(--font-display)]`}
        style={{ letterSpacing: '0.1em' }}
      >
        Corroborate
      </span>
      <div
        className="hidden sm:block mt-0.5 font-[family-name:var(--font-mono)] text-[0.58rem] font-medium uppercase text-muted-foreground whitespace-nowrap"
        style={{ letterSpacing: '0.12em' }}
      >
        Cross-Source Price Oracle
      </div>
    </div>
  );

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <ScaleMark size={markSize} />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      <ScaleMark size={markSize} />
      <span className="w-px self-stretch bg-border" aria-hidden="true" />
      <Wordmark />
    </div>
  );
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="mark" />;
}

export function LogoWordmark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="wordmark" />;
}
