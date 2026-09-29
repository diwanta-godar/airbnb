"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  MessageCircle,
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  Images,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { WhatsAppChatModal } from "@/components/admin/WhatsAppChatModal";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/stays", label: "Stays", icon: BedDouble },
  { href: "/admin/hero", label: "Hero", icon: Images },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, hydrated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chat, setChat] = useState<{ phone: string; name: string } | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) {
      router.replace("/auth/admin-login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/auth/admin-login?next=/admin");
    }
  }, [hydrated, user, accessToken, router]);

  if (!hydrated || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ef] text-muted">
        Checking admin access...
      </div>
    );
  }

  const title =
    NAV.find((n) =>
      n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
    )?.label || "Admin";

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-ink">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-[#e8dfd4] bg-[#1c1917] text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link href="/admin" className="font-brand text-lg tracking-wide">
              Lantern Admin
            </Link>
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 p-3">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white"
            >
              <Home className="h-4 w-4" />
              View site
            </Link>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close overlay"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e8dfd4] bg-[#faf8f5]/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-md border border-[#e8dfd4] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  Operations
                </p>
                <h1 className="font-brand text-xl leading-tight">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AdminNotificationBell
                onOpenChat={(phone, name) => setChat({ phone, name })}
              />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  logout().then(() => router.push("/auth/admin-login"))
                }
                className="inline-flex items-center gap-2 rounded-md border border-[#e8dfd4] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f3eee7]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>

      <WhatsAppChatModal
        open={!!chat}
        onClose={() => setChat(null)}
        phone={chat?.phone || ""}
        customerName={chat?.name || "Customer"}
      />
    </div>
  );
}
