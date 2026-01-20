"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { AxiosError } from "axios"; // Import AxiosError untuk handling error type
import { toast } from "sonner";
import { Loader2, Trash2, CalendarDays, Clock, MapPin } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/* =======================
   TYPES
======================= */
type Booking = {
  id: string;
  facility_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "canceled" | "completed";
  purpose: string;
  created_at: string;
};

/* =======================
   HELPER: FORMAT DATE
======================= */
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/* =======================
   COMPONENT
======================= */
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // 1. Fetch Data
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get<Booking[]>("/bookings/me");
      setBookings(res.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat riwayat booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 2. Handle Cancel
  const handleCancel = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan booking ini?")) return;

    setCancelingId(id);
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Booking berhasil dibatalkan");
      // Refresh manual agar status berubah
      fetchBookings(); 
    } catch (error) {
      // FIX: Menggunakan AxiosError untuk type safety menggantikan 'any'
      const err = error as AxiosError<{ error: string }>;
      const msg = err.response?.data?.error || "Gagal membatalkan booking";
      toast.error(msg);
      setCancelingId(null); // Reset jika gagal
    }
  };

  // 3. Helper Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Disetujui</Badge>;
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      case "canceled":
        return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Dibatalkan</Badge>;
      case "completed":
        return <Badge className="bg-slate-500 hover:bg-slate-600">Selesai</Badge>;
      default: // pending
        return <Badge className="bg-blue-500 hover:bg-blue-600">Menunggu</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)] px-6 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Booking Saya</h1>
          <p className="text-slate-400">
            Kelola jadwal dan riwayat peminjaman ruangan Anda.
          </p>
        </div>

        {/* CONTENT */}
        <Card className="border-slate-800 bg-slate-900/50 text-slate-200 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Daftar Peminjaman</CardTitle>
            <CardDescription className="text-slate-400">
              Menampilkan semua riwayat booking aktif dan lampau.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Memuat data...
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center space-y-4 text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                <CalendarDays className="h-10 w-10 opacity-50" />
                <p>Belum ada riwayat booking.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300">Fasilitas</TableHead>
                    <TableHead className="text-slate-300">Jadwal</TableHead>
                    <TableHead className="text-slate-300">Keperluan</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-300">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((item) => (
                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                      
                      {/* FASILITAS */}
                      <TableCell className="font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {item.facility_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 ml-6">
                          Diajukan: {formatDate(item.created_at)}
                        </div>
                      </TableCell>

                      {/* JADWAL */}
                      <TableCell>
                        <div className="flex flex-col text-sm space-y-1">
                          <div className="flex items-center gap-2 font-medium text-slate-300">
                             <CalendarDays className="h-3 w-3" />
                             {formatDate(item.start_time)}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                             <Clock className="h-3 w-3" />
                             {formatTime(item.start_time)} - {formatTime(item.end_time)}
                          </div>
                        </div>
                      </TableCell>

                      {/* KEPERLUAN */}
                      <TableCell className="max-w-[200px] truncate text-slate-400" title={item.purpose}>
                        {item.purpose}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell>{getStatusBadge(item.status)}</TableCell>

                      {/* AKSI */}
                      <TableCell className="text-right">
                        {item.status === "pending" ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancelingId === item.id}
                            onClick={() => handleCancel(item.id)}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
                          >
                            {cancelingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="mr-1 h-3 w-3" /> Batal
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-600 italic">
                             -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}