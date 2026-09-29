"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, FileText, Phone } from "lucide-react";
import {
  BUSINESS_PHONE,
  BUSINESS_PHONE_HREF,
  BUSINESS_WHATSAPP_HREF,
} from "@/lib/contact";

type Props = {
  onHome?: boolean;
};

const items = [
  {
    key: "phone",
    href: BUSINESS_PHONE_HREF,
    label: BUSINESS_PHONE,
    external: false,
    icon: "phone" as const,
  },
  {
    key: "whatsapp",
    href: BUSINESS_WHATSAPP_HREF,
    label: "WhatsApp",
    external: true,
    icon: "whatsapp" as const,
  },
  {
    key: "enquiry",
    href: "/contact",
    label: "Make an enquiry",
    external: false,
    icon: "file" as const,
  },
];

export function GetInTouch({ onHome = false }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`git-trigger group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
          onHome ? "text-white" : "text-ink"
        } ${open ? "git-trigger-open" : ""}`}
      >
        <span className="git-trigger-glow" aria-hidden="true" />
        <Phone className="relative h-3.5 w-3.5" strokeWidth={2} />
        <span className="relative">Get In Touch</span>
        <ChevronUp
          className={`relative h-3.5 w-3.5 transition duration-300 ${
            open ? "rotate-0" : "rotate-180"
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={`git-panel absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[220px] ${
            visible ? "git-panel-in" : "git-panel-out"
          }`}
        >
          <div className="git-glass" aria-hidden="true">
            <span className="git-glass-shine" />
            <span className="git-glass-fill" />
          </div>

          <ul className="relative z-10 py-1.5">
            {items.map((item, index) => {
              const icon =
                item.icon === "phone" ? (
                  <Phone className="h-3.5 w-3.5 opacity-70" />
                ) : item.icon === "whatsapp" ? (
                  <WhatsAppIcon className="h-3.5 w-3.5 opacity-70" />
                ) : (
                  <FileText className="h-3.5 w-3.5 opacity-70" />
                );

              const className = "git-row";
              const style = { animationDelay: `${60 + index * 40}ms` };

              if (item.key === "enquiry") {
                return (
                  <li key={item.key}>
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={className}
                      style={style}
                      onClick={() => setOpen(false)}
                    >
                      {icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <a
                    role="menuitem"
                    href={item.href}
                    className={className}
                    style={style}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {icon}
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
