/**
 * DriveSense SVG Icon System
 * All icons are 24x24 viewBox, stroke-based, consistent 2px weight
 */

import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

function Icon({ size = 24, color = 'currentColor', children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export function IconHome(props: IconProps) {
  return <Icon {...props}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>;
}

export function IconRoute(props: IconProps) {
  return <Icon {...props}><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></Icon>;
}

export function IconPlay(props: IconProps) {
  return <Icon {...props} fill={props.color ?? 'currentColor'} stroke="none"><polygon points="5,3 19,12 5,21" /></Icon>;
}

export function IconStop(props: IconProps) {
  return <Icon {...props} fill={props.color ?? 'currentColor'} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></Icon>;
}

export function IconTrophy(props: IconProps) {
  return <Icon {...props}><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 6 9 6 9z" /><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 18 9 18 9z" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></Icon>;
}

export function IconUser(props: IconProps) {
  return <Icon {...props}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
}

export function IconChevronRight(props: IconProps) {
  return <Icon {...props}><polyline points="9 18 15 12 9 6" /></Icon>;
}

export function IconChevronLeft(props: IconProps) {
  return <Icon {...props}><polyline points="15 18 9 12 15 6" /></Icon>;
}

export function IconArrowUp(props: IconProps) {
  return <Icon {...props}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Icon>;
}

// ─── Mode Icons ──────────────────────────────────────────────────────────────

export function IconModeSchool(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </Icon>
  );
}

export function IconModeRacing(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </Icon>
  );
}

export function IconModeEco(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.25 3.75 1.25 3.75" />
    </Icon>
  );
}

export function IconModeFree(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" />
      <path d="M5.636 5.636l12.728 12.728" />
      <path d="M3 12h18" />
      <path d="M5.636 18.364L18.364 5.636" />
    </Icon>
  );
}

// ─── Dashboard & Stats ───────────────────────────────────────────────────────

export function IconGauge(props: IconProps) {
  return <Icon {...props}><path d="M12 16.5V9.5" /><path d="M15.5 14.5l-3.5-5" /><circle cx="12" cy="12" r="10" /><path d="M12 6v1" /><path d="M18 12h-1" /><path d="M6 12h1" /><path d="M16.24 7.76l-.71.71" /><path d="M7.76 7.76l.71.71" /></Icon>;
}

export function IconRoad(props: IconProps) {
  return <Icon {...props}><path d="M4 19L8 5" /><path d="M16 5l4 14" /><line x1="12" y1="6" x2="12" y2="8" /><line x1="12" y1="11" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="18" /></Icon>;
}

export function IconActivity(props: IconProps) {
  return <Icon {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>;
}

export function IconStar(props: IconProps) {
  return <Icon {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" /></Icon>;
}

export function IconBarChart(props: IconProps) {
  return <Icon {...props}><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></Icon>;
}

export function IconClock(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
}

export function IconMapPin(props: IconProps) {
  return <Icon {...props}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></Icon>;
}

export function IconZap(props: IconProps) {
  return <Icon {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></Icon>;
}

export function IconTarget(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
}

export function IconShield(props: IconProps) {
  return <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function IconShare(props: IconProps) {
  return <Icon {...props}><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></Icon>;
}

export function IconEdit(props: IconProps) {
  return <Icon {...props}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>;
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Icon>
  );
}

// ─── Auth & Profile ──────────────────────────────────────────────────────────

export function IconMail(props: IconProps) {
  return <Icon {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></Icon>;
}

export function IconLock(props: IconProps) {
  return <Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></Icon>;
}

export function IconCheck(props: IconProps) {
  return <Icon {...props}><polyline points="20 6 9 17 4 12" /></Icon>;
}

export function IconLogOut(props: IconProps) {
  return <Icon {...props}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>;
}

// ─── Settings Menu ───────────────────────────────────────────────────────────

export function IconBell(props: IconProps) {
  return <Icon {...props}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></Icon>;
}

export function IconRuler(props: IconProps) {
  return <Icon {...props}><path d="M21.174 6.812a1 1 0 00-3.986-3.987L3.842 16.174a2 2 0 00-.5.83l-1.321 4.352a.5.5 0 00.623.622l4.353-1.32a2 2 0 00.83-.497z" /><path d="m15 5 4 4" /></Icon>;
}

export function IconPalette(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="13.5" cy="6.5" r="1.5" fill={props.color ?? 'currentColor'} stroke="none" />
      <circle cx="17.5" cy="10.5" r="1.5" fill={props.color ?? 'currentColor'} stroke="none" />
      <circle cx="8.5" cy="7.5" r="1.5" fill={props.color ?? 'currentColor'} stroke="none" />
      <circle cx="6.5" cy="12.5" r="1.5" fill={props.color ?? 'currentColor'} stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </Icon>
  );
}

export function IconEye(props: IconProps) {
  return <Icon {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Icon>;
}

export function IconDownload(props: IconProps) {
  return <Icon {...props}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>;
}

export function IconHelpCircle(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>;
}

export function IconAward(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></Icon>;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function IconGlobe(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></Icon>;
}

export function IconUsers(props: IconProps) {
  return <Icon {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Icon>;
}

export function IconPlus(props: IconProps) {
  return <Icon {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
}

export function IconTrash(props: IconProps) {
  return <Icon {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Icon>;
}

export function IconUserPlus(props: IconProps) {
  return <Icon {...props}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></Icon>;
}

// ─── DriveSense Logo ─────────────────────────────────────────────────────────

export function LogoDriveSense({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* Outer ring */}
      <circle cx="24" cy="24" r="22" stroke="url(#logo-gradient)" strokeWidth="2" opacity="0.4" />
      {/* Speed arc */}
      <path
        d="M 10 34 A 18 18 0 1 1 38 34"
        stroke="url(#logo-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Needle */}
      <line x1="24" y1="24" x2="32" y2="14" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="3" fill="url(#logo-gradient)" />
      {/* Tick marks */}
      <line x1="24" y1="6" x2="24" y2="9" stroke="var(--color-ds-text-muted, #5e5e76)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="12" x2="36" y2="14" stroke="var(--color-ds-text-muted, #5e5e76)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="24" x2="39" y2="24" stroke="var(--color-ds-text-muted, #5e5e76)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="24" x2="9" y2="24" stroke="var(--color-ds-text-muted, #5e5e76)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="12" x2="12" y2="14" stroke="var(--color-ds-text-muted, #5e5e76)" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="logo-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-ds-primary, #00f0ff)" />
          <stop offset="1" stopColor="var(--color-ds-primary-dim, #00b8d4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Rank Icons (SVG medals) ─────────────────────────────────────────────────

export function IconMedalGold({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="7" fill="#FFD700" opacity="0.2" stroke="#FFD700" strokeWidth="1.5" />
      <text x="12" y="17.5" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="700">1</text>
      <path d="M8 2l4 5 4-5" stroke="#FFD700" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMedalSilver({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="7" fill="#C0C0C0" opacity="0.2" stroke="#C0C0C0" strokeWidth="1.5" />
      <text x="12" y="17.5" textAnchor="middle" fill="#C0C0C0" fontSize="10" fontWeight="700">2</text>
      <path d="M8 2l4 5 4-5" stroke="#C0C0C0" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMedalBronze({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="7" fill="#CD7F32" opacity="0.2" stroke="#CD7F32" strokeWidth="1.5" />
      <text x="12" y="17.5" textAnchor="middle" fill="#CD7F32" fontSize="10" fontWeight="700">3</text>
      <path d="M8 2l4 5 4-5" stroke="#CD7F32" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function IconMap(props: IconProps) {
  return <Icon {...props}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></Icon>;
}

export function IconCar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 16H9m5.5-4h.01M5 11l1.5-4.5h11L19 11" />
      <path d="M3 11h18v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </Icon>
  );
}

export function IconTrendUp(props: IconProps) {
  return <Icon {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>;
}
