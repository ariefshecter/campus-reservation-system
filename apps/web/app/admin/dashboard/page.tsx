"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  History,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* =======================
   TYPES
======================= */
type TopFacility = {
  name: string;
  book_count: number;
};

type RecentBooking = {
  user_name: string;
  facility_name: string;
  status: string;
  created_at: string;
};

type PeakHour = {
  hour: number;
  count: number;
};

type DashboardStats = {
  total_users: number;
  total_facilities: number;
  pending_bookings: number;
  active_bookings: number;
  top_facilities: TopFacility[] | null;
  recent_bookings: RecentBooking[] | null;
  peak_hours: PeakHour[] | null;
};

type StatCardProps = {
  title: string;
  value: number | string | undefined;
  icon: ReactNode;
  description: string;
  colorClass: string;
};

// Interface khusus untuk Tooltip agar tidak error TypeScript & Linter
interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: string | number }[];
  label?: string;
}

/* =======================
   COMPONENTS HELPER
======================= */
function StatCard({ title, value, icon, description, colorClass }: StatCardProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div className={`rounded-full p-2 ${colorClass} bg-opacity-10`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value ?? 0}</div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    approved: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    completed: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    rejected: "bg-red-100 text-red-700 hover:bg-red-100",
    canceled: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  };
  
  const safeStatus = status ? status.toLowerCase() : "unknown";
  
  return (
    <Badge className={`${styles[safeStatus] || "bg-gray-100 text-gray-600"} border-0 shadow-none font-normal`}>
      {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
    </Badge>
  );
}

// Menggunakan interface CustomTooltipProps yang aman
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        <p className="text-indigo-600 font-medium">
          {payload[0].value} Booking
        </p>
      </div>
    );
  }
  return null;
};

/* =======================
   MAIN PAGE
======================= */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (error) {
      console.error("Gagal memuat statistik:", error);
      toast.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handler = () => fetchStats();
    window.addEventListener("admin-booking-updated", handler);
    return () => window.removeEventListener("admin-booking-updated", handler);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // 1. FILTER JAM: Hanya ambil jam 08:00 sampai 16:00
  const chartData = (stats.peak_hours || [])
    .filter((p) => p.hour >= 8 && p.hour <= 16)
    .map((p) => ({
      hour: `${p.hour.toString().padStart(2, '0')}:00`,
      count: p.count,
    }));

  const topFacilities = stats.top_facilities || [];
  const recentBookings = stats.recent_bookings || [];

  return (
    <div className="space-y-8 p-1">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Ringkasan aktivitas sistem reservasi kampus.
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pengguna"
          value={stats.total_users}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Mahasiswa & Staff"
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Fasilitas"
          value={stats.total_facilities}
          icon={<Building2 className="h-4 w-4 text-indigo-600" />}
          description="Siap digunakan"
          colorClass="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          title="Perlu Persetujuan"
          value={stats.pending_bookings}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          description="Menunggu review"
          colorClass="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Booking Aktif"
          value={stats.active_bookings}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          description="Sedang berlangsung"
          colorClass="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* GRID TENGAH */}
      <div className="grid gap-4 md:grid-cols-7">
        
        {/* CHART JAM SIBUK */}
        <Card className="col-span-4 border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Jam Sibuk Kampus
            </CardTitle>
            <CardDescription>
              Intensitas peminjaman (08:00 - 16:00)
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[250px] w-full mt-2 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="hour" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  {/* Gunakan Custom Tooltip di sini */}
                  <Tooltip cursor={{ fill: "#f1f5f9" }} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#6366f1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* LIST FASILITAS POPULER */}
        <Card className="col-span-3 border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Fasilitas Terpopuler
            </CardTitle>
            <CardDescription>
              5 Ruangan paling sering dipinjam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {topFacilities.length > 0 ? (
                topFacilities.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-600 group-hover:bg-slate-100 transition-colors">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {item.book_count} <span className="text-slate-400 font-normal text-xs">kali</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Belum ada data statistik.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AKTIVITAS TERBARU */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-500" />
            Aktivitas Terbaru
          </CardTitle>
          <CardDescription>
            Booking yang baru saja masuk atau diperbarui
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentBookings && recentBookings.length > 0 ? (
              recentBookings.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
                >
                  <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                    <p className="text-sm font-medium text-slate-900">
                      {item.user_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Memesan <span className="font-medium text-slate-700">{item.facility_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-400 font-medium">
                      {item.created_at}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">
                Belum ada aktivitas terbaru.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}