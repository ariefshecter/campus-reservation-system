"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { 
  Loader2, 
  Trash2, 
  CalendarDays, 
  Clock, 
  MapPin, 
  Search, 
  UserCheck,
  Download
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* =======================
   TYPES
======================= */
type BookingStatus = "pending" | "approved" | "rejected" | "canceled" | "completed";

type Booking = {
  id: string;
  facility_name: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  created_at: string;
  admin_name?: string;
  ticket_code?: string;
  is_checked_in?: boolean;
  is_checked_out?: boolean;
  attendance_status?: string; // Field baru untuk status kehadiran detail
  // Field User & Profile dari Backend
  user: {
    name: string;
    profile: {
      full_name: string;
      identity_number: string;
    };
  };
};

/* =======================
   HELPER
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

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
      fetchBookings(); 
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      const msg = err.response?.data?.error || "Gagal membatalkan booking";
      toast.error(msg);
    } finally {
      setCancelingId(null);
    }
  };

  // 3. Logic Download Tiket GAMBAR (PNG)
  const downloadTicket = async (item: Booking) => {
    if (!item.ticket_code) {
      toast.error("Kode tiket tidak tersedia");
      return;
    }

    try {
      setDownloadingId(item.id); 

      const response = await api.get(`/bookings/${item.id}/ticket`, {
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tiket_UniSpace_${item.ticket_code}.png`);
      
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("E-Ticket berhasil diunduh!");

    } catch (error) {
      console.error("Gagal download tiket:", error);
      toast.error("Gagal mengunduh tiket gambar. Silakan coba lagi.");
    } finally {
      setDownloadingId(null); 
    }
  };

  // 4. Filter Logic
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch = 
        b.facility_name.toLowerCase().includes(search.toLowerCase()) || 
        b.purpose.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === "all" ? true : b.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  // 5. Helper Status Badge (UPDATED)
  const renderStatus = (item: Booking) => {
    // === HANDLING STATUS COMPLETED (SELESAI) ===
    if (item.status === "completed") {
      return (
        <div className="flex flex-col items-start gap-1.5">
          <Badge className="bg-slate-500 hover:bg-slate-600">Selesai</Badge>
          
          {/* Badge Detail Kehadiran */}
          {item.attendance_status === "on_time" && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] h-5 px-1.5">
              Tepat Waktu
            </Badge>
          )}
          {item.attendance_status === "late" && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 text-[10px] h-5 px-1.5">
              Telat / Terlambat
            </Badge>
          )}
          {item.attendance_status === "no_show" && (
            <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10 text-[10px] h-5 px-1.5">
              Tidak Hadir
            </Badge>
          )}
        </div>
      );
    }

    // === HANDLING STATUS LAINNYA ===
    let badge;
    switch (item.status) {
      case "approved":
        badge = <Badge className="bg-emerald-500 hover:bg-emerald-600">Disetujui</Badge>;
        break;
      case "rejected":
        badge = <Badge variant="destructive">Ditolak</Badge>;
        break;
      case "canceled":
        badge = <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Dibatalkan</Badge>;
        break;
      default: // pending
        badge = <Badge className="bg-blue-500 hover:bg-blue-600">Menunggu</Badge>;
    }

    // Tambahan info admin jika disetujui/ditolak
    if ((item.status === "approved" || item.status === "rejected") && item.admin_name) {
      return (
        <div className="flex flex-col items-start gap-1">
          {badge}
          <div className="flex items-center text-[11px] text-slate-400 mt-0.5">
            <UserCheck className="mr-1 h-3 w-3" />
            <span>Oleh: {item.admin_name}</span>
          </div>
        </div>
      );
    }

    return badge;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)] px-6 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Booking Saya</h1>
          <p className="text-slate-400">Kelola jadwal dan riwayat peminjaman ruangan Anda.</p>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Cari fasilitas atau keperluan..."
              className="pl-9 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
             {(["all", "pending", "approved", "completed", "rejected", "canceled"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "capitalize border-slate-700",
                    statusFilter === status 
                      ? "bg-blue-600 text-white border-blue-600" 
                      : "bg-transparent text-slate-300 hover:bg-slate-800"
                  )}
                >
                  {status === "all" ? "Semua" : status}
                </Button>
             ))}
          </div>
        </div>

        {/* CONTENT */}
        <Card className="border-slate-800 bg-slate-900/50 text-slate-200 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Daftar Peminjaman</CardTitle>
            <CardDescription className="text-slate-400">
              Menampilkan {filteredBookings.length} data booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat data...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center space-y-4 text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                <CalendarDays className="h-10 w-10 opacity-50" />
                <p>Tidak ada data booking yang sesuai.</p>
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
                  {filteredBookings.map((item) => (
                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                      
                      <TableCell className="font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {item.facility_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 ml-6">
                          Diajukan: {formatDate(item.created_at)}
                        </div>
                      </TableCell>

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

                      <TableCell className="max-w-[200px] truncate text-slate-400" title={item.purpose}>
                        {item.purpose}
                      </TableCell>

                      <TableCell>{renderStatus(item)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Tombol Tiket (Hanya untuk Approved/Completed) */}
                          {(item.status === "approved" || item.status === "completed") && item.ticket_code && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadTicket(item)}
                              disabled={downloadingId === item.id} 
                              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                            >
                              {downloadingId === item.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="mr-1 h-3 w-3" />
                              )}
                              Tiket
                            </Button>
                          )}

                          {/* Tombol Batal (Hanya untuk Pending) */}
                          {item.status === "pending" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={cancelingId === item.id}
                              onClick={() => handleCancel(item.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                            >
                              {cancelingId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <><Trash2 className="mr-1 h-3 w-3" /> Batal</>
                              )}
                            </Button>
                          )}
                        </div>
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