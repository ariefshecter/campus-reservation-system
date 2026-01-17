"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Building2, CalendarCheck, LogOut, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "../hooks/use-auth" // Sesuaikan path jika perlu (misal "@/hooks/use-auth")

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Kelola Fasilitas",
    href: "/admin/facilities",
    icon: Building2,
  },
  {
    title: "Data Pengguna",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Approval Booking",
    href: "/admin/bookings",
    icon: CalendarCheck,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout, user, fetchUser } = useAuth() 
  const router = useRouter()

  // PERBAIKAN: Tambahkan [fetchUser] ke dalam dependency array
  useEffect(() => {
    fetchUser()
  }, [fetchUser]) 

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen w-64 flex-col justify-between border-r bg-slate-900 text-white fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-400 mb-1">Admin Panel</h1>
        <p className="text-xs text-slate-400 mb-8">Sistem Reservasi Kampus</p>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-6 px-1">
            {/* Avatar */}
            <div className="h-9 w-9 min-w-[2.25rem] rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            
            {/* Info User */}
            <div className="overflow-hidden">
                <p className="text-sm font-medium truncate" title={user?.name}>
                    {user?.name || "Admin"}
                </p>
                <p className="text-xs text-slate-400 truncate" title={user?.email}>
                    {user?.email || "Loading..."}
                </p>
                <p className="text-[10px] text-blue-400 font-semibold truncate uppercase mt-0.5">
                    Administrator
                </p>
            </div>
        </div>

        <Button 
            variant="destructive" 
            className="w-full justify-start hover:bg-red-600 transition-colors" 
            onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}