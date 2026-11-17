"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { GithubMark } from "./icons";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/gallery", label: "Gallery", icon: LayoutGrid },
  { href: "/builder", label: "Builder", icon: Sparkles },
  { href: "/sources", label: "Sources", icon: BookOpen },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="hs-nav">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 mr-2 shrink-0" aria-label="HA Dashboard Studio home">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-[9px] text-[15px] font-bold"
            style={{ background: "var(--brand)", color: "#04121b" }}
          >
            ⌂
          </span>
          <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">
            HA Dashboard Studio
          </span>
        </Link>

        <nav className="hs-scroll-x flex min-w-0 items-center gap-1" aria-label="Main">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn("hs-btn hs-btn--ghost hs-btn--sm shrink-0 gap-1.5")}
                style={
                  active
                    ? { background: "var(--brand-soft)", color: "var(--brand)" }
                    : undefined
                }
                aria-current={active ? "page" : undefined}
              >
                <Icon size={15} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <a
            className="hs-btn hs-btn--ghost hs-btn--sm"
            href="https://github.com/andokivilaid/ha-dashboard-studio"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source on GitHub"
          >
            <GithubMark size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
