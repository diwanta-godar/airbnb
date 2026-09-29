"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { GetInTouch } from "@/components/GetInTouch";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);

  return (
    <header
      className={
        isHome
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span
            className={`relative overflow-hidden rounded-md shadow-sm ring-1 ${
              isHome ? "ring-white/25" : "ring-[#e8dccf]"
            }`}
          >
            <Image
              src="/brand/logo.png"
              alt="The Lantern Stay"
              width={48}
              height={48}
              priority
              className="h-11 w-11 object-cover md:h-12 md:w-12"
            />
          </span>
          <span className="hidden sm:block">
            <span
              className={`block font-brand text-[15px] leading-tight tracking-[0.04em] md:text-base ${
                isHome ? "text-white" : "text-ink"
              }`}
            >
              THE LANTERN STAY
            </span>
            <span
              className={`mt-0.5 block text-[11px] tracking-[0.08em] ${
                isHome ? "text-white/70" : "text-[#D47A3B]"
              }`}
            >
              Atithi Devo Bhavah
            </span>
          </span>
        </Link>

        <nav
          className={`hidden items-center gap-5 text-sm lg:flex ${
            isHome ? "text-white/90" : "text-muted"
          }`}
        >
          <Link href="/stays" className="hover:text-inherit hover:underline">
            Stays
          </Link>
          <Link href="/about" className="hover:text-inherit hover:underline">
            About
          </Link>
          <Link href="/contact" className="hover:text-inherit hover:underline">
            Contact
          </Link>
          <GetInTouch onHome={isHome} />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <GetInTouch onHome={isHome} />
          <button
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-full ${
              isHome ? "bg-white/15 text-white" : "bg-ink/5 text-ink"
            }`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 py-4 text-sm text-ink lg:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/stays" onClick={() => setOpen(false)}>
              Stays
            </Link>
            <Link href="/about" onClick={() => setOpen(false)}>
              About
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)}>
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
