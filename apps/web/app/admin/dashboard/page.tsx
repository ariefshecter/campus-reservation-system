"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Users,
  Building2,
  Clock,
  CalendarCheck,
  TrendingUp,
  Activity,
  BarChart3,
} from "lucide-react"
import api from "@/lib/axios"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

/* =======================
   TYPES
======================= */
type TopFacility = {
  name: string
  book_count: number
}

type RecentBooking = {
  user_name: string
  facility_name: string
  status: string
  created_at: string
}

type PeakHour = {
  hour: number
  count: number
}

type DashboardStats = {
  total_users: number
  total_facilities: number
  pending_bookings: number
  active_bookings: number
  top_facilities: TopFacility[] | null
  recent_bookings: RecentBooking[] | null
  peak_hours: PeakHour[] | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  /* =======================
     FETCH DASHBOARD STATS
     (REUSABLE)
  ======================= */
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/stats")
      setStats(res.data)
    } catch (error) {
      console.error("Gagal memuat statistik:", error)
      toast.error("Gagal memuat data dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  /* =======================
     INITIAL LOAD
  ======================= */
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  /* =======================
     AUTO REFRESH LISTENER
     Dipicu dari halaman admin lain
     (approve / reject / cancel)
  ======================= */
  useEffect(() => {
    const handler = () => {
      fetchStats()
    }

    window.addEventListener("admin-booking-updated", handler)

    return () => {
      window.removeEventListener("admin-booking-updated", handler)
    }
  }, [fetchStats])

  /* =======================
     LOADING STATE
  ======================= */
  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-slate-500 animate-pulse">
          Memuat data statistik...
        </p>
      </div>
    )
  }

  if (!stats) return null

  /* =======================
     HELPERS
  ======================= */
  const topFacilities = stats.top_facilities || []
  const recentBookings = stats.recent_bookings || []
  const peakHours = stats.peak_hours || []

  const maxCount = Math.max(...peakHours.map(p => p.count), 1)

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Dashboard
        </h1>
        <p className="text-slate-500">
          Ringkasan aktivitas sistem reservasi kampus
        </p>
      </div>

      {/* ===== 1. KARTU STATISTIK ===== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_users}
            </div>
            <p className="text-xs text-slate-500">
              Mahasiswa & Staff terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Fasilitas
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_facilities}
            </div>
            <p className="text-xs text-slate-500">
              Ruangan & Gedung aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Perlu Persetujuan
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending_bookings}
            </div>
            <p className="text-xs text-slate-500">
              Permintaan booking pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Booking Disetujui
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {stats.active_bookings}
            </div>
            <p className="text-xs text-slate-500">
              Total reservasi berhasil
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== 2. GRAFIK JAM SIBUK ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Jam Sibuk Kampus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end gap-2">
            {peakHours.map((item, i) => {
              const height = Math.round(
                (item.count / maxCount) * 100
              )

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full h-[160px] flex items-end justify-center">
                    <div className="w-full h-full bg-slate-50 rounded-t-md overflow-hidden flex items-end justify-center">
                      <div
                        className="w-4/5 bg-indigo-500 rounded-t-sm transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {item.hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== 3. FASILITAS TERPOPULER ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Fasilitas Terpopuler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Ruangan</TableHead>
                <TableHead className="text-right">
                  Total Booking
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topFacilities.length > 0 ? (
                topFacilities.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.book_count}x
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-slate-500 h-24"
                  >
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== 4. AKTIVITAS TERBARU ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Ruangan</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.length > 0 ? (
                recentBookings.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {item.user_name}
                    </TableCell>
                    <TableCell>
                      {item.facility_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {item.created_at}
                    </TableCell>
                    <TableCell>
                      {item.status === "approved" && (
                        <Badge className="bg-green-100 text-green-700">
                          Disetujui
                        </Badge>
                      )}
                      {item.status === "pending" && (
                        <Badge className="bg-orange-100 text-orange-700">
                          Pending
                        </Badge>
                      )}
                      {item.status === "rejected" && (
                        <Badge className="bg-red-100 text-red-700">
                          Ditolak
                        </Badge>
                      )}
                      {item.status === "cancelled" && (
                        <Badge className="bg-slate-100 text-slate-700">
                          Batal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-slate-500 h-24"
                  >
                    Belum ada aktivitas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
