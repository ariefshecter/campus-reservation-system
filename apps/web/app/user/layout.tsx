"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type User = {
  name: string;
};

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api
      .get<User>("/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  const isActive = (path: string) =>
    pathname.startsWith(path)
      ? "text-white bg-white/10"
      : "text-slate-300 hover:text-white hover:bg-white/5";

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50">
        <div className="relative">
          {/* light rim */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/30" />

          <div className="backdrop-blur-xl bg-slate-900/70 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              {/* LEFT */}
              <div className="flex items-center gap-10">
                <Link
                  href="/user/dashboard"
                  className="text-lg font-semibold text-white tracking-tight"
                >
                  Campus Book
                </Link>

                <nav className="hidden md:flex items-center gap-2 text-sm">
                  <Link
                    href="/user/dashboard"
                    className={`rounded-lg px-4 py-2 transition ${isActive(
                      "/user/dashboard"
                    )}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/user/my-bookings"
                    className={`rounded-lg px-4 py-2 transition ${isActive(
                      "/user/my-bookings"
                    )}`}
                  >
                    Booking Saya
                  </Link>
                </nav>
              </div>

              {/* RIGHT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* FIX: Tambahkan suppressHydrationWarning di sini */}
                  <Button
                    variant="ghost"
                    suppressHydrationWarning={true}
                    className="flex items-center gap-3 rounded-full px-3 py-2 hover:bg-white/10"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white shadow-inner">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="hidden md:inline text-sm text-slate-200">
                      {user?.name || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-xl bg-slate-900 text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                >
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer hover:bg-white/10"
                  >
                    <Link href="/user/profile">Edit Profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main>{children}</main>
    </div>
  );
}