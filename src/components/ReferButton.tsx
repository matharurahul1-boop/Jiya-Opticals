import type { CSSProperties } from 'react';
import { Gift, ExternalLink } from 'lucide-react';

// The referral app linked from the Refer button.
const REFERRAL_URL = 'https://referral-umber.vercel.app/';

/**
 * Link to the referral app for the signed-in user, so it knows who is referring:
 * ?referrerEmail=…&referrerName=…  The name is the one the person gave, else the part of the email before the @.
 */
export function referralUrl(email?: string, name?: string): string {
  const mail = (email || '').trim();
  if (!mail) return REFERRAL_URL;
  const given = (name || '').trim();
  const referrerName = given && !given.includes('@') ? given : mail.split('@')[0];
  return `${REFERRAL_URL}?${new URLSearchParams({ referrerEmail: mail, referrerName })}`;
}

// Sparkles that twinkle around the gift on hover: position (px from the gift's centre), size and start delay.
const SPARKLES = [
  { x: -11, y: -11, size: 7, delay: 0 },
  { x: 12, y: -9, size: 5, delay: 90 },
  { x: 10, y: 11, size: 6, delay: 170 },
];

/** "Refer & earn" button. With `expanded` false (collapsed sidebar) it shrinks to the gift icon. */
export function ReferButton({ email, name, expanded = true, className = '' }: { email?: string; name?: string; expanded?: boolean; className?: string }) {
  return (
    <a
      href={referralUrl(email, name)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Refer and earn (opens the referral app in a new tab)"
      title={expanded ? undefined : 'Refer & earn'}
      className={`refer-button group relative isolate flex h-11 items-center overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-[13.5px] font-semibold text-white shadow-lg shadow-amber-500/25 ring-1 ring-white/15 transition hover:shadow-amber-500/40 hover:brightness-105 ${expanded ? 'gap-2.5 px-3' : 'justify-center'} ${className}`}
    >
      <span className="relative grid w-5 h-5 shrink-0 place-items-center">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="refer-sparkle"
              style={{ '--sparkle-x': `${s.x}px`, '--sparkle-y': `${s.y}px`, '--sparkle-size': `${s.size}px`, '--sparkle-delay': `${s.delay}ms` } as CSSProperties}
            />
          ))}
        </span>
        <Gift className="refer-gift w-5 h-5" />
      </span>
      {expanded && (
        <>
          <span className="truncate">Refer &amp; earn</span>
          <ExternalLink className="ml-auto w-3.5 h-3.5 opacity-70 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </>
      )}
    </a>
  );
}
