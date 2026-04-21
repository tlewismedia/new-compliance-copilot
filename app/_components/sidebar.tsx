"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOGO_FONT } from "./shared";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/evaluations", label: "Evaluations", icon: EvalIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
] as const;

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-[#2d4a35]/[0.08] bg-white/60 px-4 py-6 backdrop-blur-md"
    >
      <Link
        href="/"
        aria-label="Starling Data"
        className="flex items-center gap-3 px-2 pb-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/starlinglogo.svg"
          alt=""
          className="h-9 w-9 object-contain"
        />
        <span
          className="text-[17px] tracking-tight text-[#1f2a23]"
          style={LOGO_FONT}
        >
          Starling Data
        </span>
      </Link>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-[#dfeee3] text-[#2d4a35] ring-1 ring-[#9cc9a9]/40"
                    : "text-[#435048] hover:bg-white/80"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  const c = active ? "#2d4a35" : "#6b7a70";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.3" />
    </svg>
  );
}

function EvalIcon({ active }: { active: boolean }) {
  const c = active ? "#2d4a35" : "#6b7a70";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 13V3M3 13h10" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 10V7M9 10V5M12 10V8" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  const c = active ? "#2d4a35" : "#6b7a70";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke={c} strokeWidth="1.3" />
      <path d="M8 5V8L10 9.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  const c = active ? "#2d4a35" : "#6b7a70";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2.5" width="2.5" height="11" rx="0.6" stroke={c} strokeWidth="1.3" />
      <rect x="6.5" y="2.5" width="2.5" height="11" rx="0.6" stroke={c} strokeWidth="1.3" />
      <path
        d="M10.5 3.5L12.8 3L14 13L11.7 13.5L10.5 3.5Z"
        stroke={c}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
