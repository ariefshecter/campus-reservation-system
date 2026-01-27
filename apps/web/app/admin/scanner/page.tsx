"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { 
  Loader2, Camera, 
  Search, Calendar, Clock, MapPin, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ScanResponse {
  message: string;
  type?: "checkin" | "checkout_on_time" | "checkout_late";
  error?: string;
}

interface Booking {
  id: string;
  user_name: string;
  facility_name: string;
  start_time: string;
  end_time: string;
  purpose: string;
  is_checked_in: boolean;
  is_checked_out: boolean;
  checkout_status: string;
  status: string;
}

export default function AdminScannerPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Menggunakan useCallback agar fungsi stabil dan aman dimasukkan ke dependency useEffect
  const fetchApprovedBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Booking[]>("/bookings?status=approved");
      setBookings(res.data ?? []);
    } catch {
      toast.error("Gagal memuat daftar booking");
    } finally {
      setLoading(false);
    }
  }, []);

  const processScan = useCallback(async (ticketCode: string) => {
    setIsProcessing(true);
    try {
      const res = await api.post<ScanResponse>("/bookings/verify-ticket", {
        ticket_code: ticketCode,
      });
      setScanResult(res.data);
      toast.success(res.data.message);
      fetchApprovedBookings(); 
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      setScanResult({ message: "", error: err.response?.data?.error || "Gagal" });
      toast.error(err.response?.data?.error);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchApprovedBookings]);

  useEffect(() => {
    fetchApprovedBookings();

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    async function onScanSuccess(decodedText: string) {
      if (!isProcessing) {
        processScan(decodedText);
      }
    }

    scanner.render(onScanSuccess, () => {
      // Callback error scan diabaikan untuk menghindari spam log
    });

    return () => {
      scanner.clear().catch((error) => console.error("Scanner clear error:", error));
    };
  }, [fetchApprovedBookings, processScan, isProcessing]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => 
      b.user_name.toLowerCase().includes(search.toLowerCase()) ||
      b.facility_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [bookings, search]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI: SCANNER */}
        <Card className="lg:col-span-1 border-slate-800 bg-slate-900/50 text-slate-200 h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-400" /> Scanner Tiket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="reader" className="overflow-hidden rounded-lg border-2 border-slate-700 bg-black"></div>
            
            {scanResult && (
              <div className={`p-3 rounded-md border text-sm ${
                scanResult.error ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
              }`}>
                {scanResult.message || scanResult.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KOLOM KANAN: DAFTAR BOOKING */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50 text-slate-200">
          <CardHeader>
            <CardTitle>Daftar Antrean Check-In/Out</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Cari peminjam atau fasilitas..." 
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-10 text-slate-500 italic">Tidak ada data antrean.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead>Peminjam</TableHead>
                    <TableHead>Fasilitas</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Log Scan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((b) => (
                    <TableRow key={b.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <User className="h-3 w-3 text-slate-400" /> {b.user_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-slate-400" /> {b.facility_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] space-y-1">
                          <div className="flex items-center gap-1 text-slate-300">
                            <Calendar className="h-3 w-3" /> 
                            {new Date(b.start_time).toLocaleDateString('id-ID')}
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-3 w-3" /> 
                            {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={b.is_checked_in ? "default" : "outline"} className={b.is_checked_in ? "bg-blue-600" : "text-slate-500"}>
                            {b.is_checked_in ? "Sudah Masuk" : "Belum Masuk"}
                          </Badge>
                          {b.is_checked_in && (
                            <Badge className={
                              b.is_checked_out 
                                ? b.checkout_status === "late" ? "bg-red-500" : "bg-emerald-500" 
                                : "bg-slate-700"
                            }>
                              {b.is_checked_out 
                                ? b.checkout_status === "late" ? "Keluar (Telat)" : "Selesai" 
                                : "Belum Keluar"}
                            </Badge>
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