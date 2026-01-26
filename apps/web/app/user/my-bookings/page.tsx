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

// Library untuk Tiket
import * as QRCode from "qrcode";
import jsPDF from "jspdf";

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

  // 3. Logic Download Tiket PDF (LENGKAP DENGAN NAMA & IDENTITAS)
const downloadTicket = async (item: Booking) => {
  if (!item.ticket_code) {
    toast.error("Kode tiket tidak tersedia");
    return;
  }

  // Debugging: Cek data di console browser (F12) jika nama masih kosong
  console.log("Data Booking:", item);

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a6", 
    });

    // AMBIL DATA DARI STRUKTUR BACKEND
    // Backend mengirim: User { Name, Profile { FullName, IdentityNumber } }
    const buyerName = item.user?.profile?.full_name || item.user?.name || "PEMESAN";
    const identityNum = item.user?.profile?.identity_number || "TIDAK ADA ID";

    // --- HEADER ---
    doc.setFillColor(7, 26, 51);
    doc.rect(0, 0, 105, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("UniSpace Ticket", 52.5, 15, { align: "center" });

    // --- CONTENT ---
    doc.setTextColor(50, 50, 50);
    
    // Nama Pemesan
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("NAMA PEMESAN", 10, 35);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(buyerName.toUpperCase(), 10, 41); // Sedikit turun ke 41 agar rapi

    // Identitas
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("IDENTITAS (NIM/NIP)", 10, 52);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(identityNum, 10, 58);

    // Ruangan
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("RUANGAN", 10, 69);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(item.facility_name.toUpperCase(), 10, 75);

    // Waktu
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("WAKTU PENGGUNAAN", 10, 86);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(formatDate(item.start_time), 10, 92);
    doc.text(`${formatTime(item.start_time)} - ${formatTime(item.end_time)} WIB`, 10, 98);

    // Garis Pemisah
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(5, 105, 100, 105);

    // --- QR CODE ---
    const qrDataUrl = await QRCode.toDataURL(item.ticket_code, {
      margin: 1,
      width: 300,
      color: { dark: "#071a33" }
    });
    doc.addImage(qrDataUrl, "PNG", 32.5, 108, 40, 40);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(item.ticket_code, 52.5, 145, { align: "center" });

    doc.save(`Tiket_UniSpace_${item.ticket_code}.pdf`);
    toast.success("Tiket berhasil diunduh");
  } catch (err) {
    console.error(err);
    toast.error("Gagal membuat tiket PDF");
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

  // 5. Helper Status Badge
  const renderStatus = (item: Booking) => {
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
      case "completed":
        badge = <Badge className="bg-slate-500 hover:bg-slate-600">Selesai</Badge>;
        break;
      default: // pending
        badge = <Badge className="bg-blue-500 hover:bg-blue-600">Menunggu</Badge>;
    }

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
                          {/* Tombol Tiket (Hanya untuk Approved) */}
                          {item.status === "approved" && item.ticket_code && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadTicket(item)}
                              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                            >
                              <Download className="mr-1 h-3 w-3" /> Tiket
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

                          {/* Info jika sudah Check-out */}
                          {item.is_checked_out && (
                            <span className="text-xs text-slate-500 italic py-1 px-2">Selesai</span>
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