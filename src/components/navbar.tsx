"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload",    label: "Cargar archivos" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-50 shadow-sm"
      style={{ background: "var(--affinity-primary)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-9 w-32 flex-shrink-0">
            <Image
              src="/logo-afiniti.png"
              alt="Afiniti Financial"
              fill
              style={{ objectFit: "contain", objectPosition: "left center" }}
              priority
            />
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-widest text-white/60 sm:block">
            Dashboard Cobranzas
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                path.startsWith(href)
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
