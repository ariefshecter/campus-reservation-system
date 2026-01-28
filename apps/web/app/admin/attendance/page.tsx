"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Loader2, 
  Search, 
  Download, 
  CalendarDays,
  Clock,
  Filter
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* =======================
   TYPES
======================= */
type AttendanceLog = {
  id: string;
  user_name: string;
  user: {
    profile: {
      identity_number: string;
      full_name: string;
    }
  };
  facility_name: string;
  start_time: string; // ISO String
  end_time: string;
  checked_in_at?: string;
  checked_out_at?: string;
  status: string; // approved, completed
  attendance_status: string; // on_time, late, no_show, etc
};

/* =======================
   COMPONENT
======================= */
export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Initial Load & Refresh
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, startDate, endDate]); // Refresh saat filter berubah

  // 1. Fetch Data
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        status: statusFilter === "all" ? "" : statusFilter,
      };
      
      const res = await api.get("/admin/attendance", { params });
      setLogs(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data kehadiran");
    } finally {
      setLoading(false);
    }
  };

  // 2. Export Excel Logic
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = {
        start_date: startDate,
        end_date: endDate,
        status: statusFilter === "all" ? "" : statusFilter,
      };

      // Request Blob dari Backend
      const res = await api.get("/admin/attendance/export", {
        params,
        responseType: "blob", 
      });

      // Buat URL dan download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      
      // Format nama file: Laporan_YYYY-MM-DD.xlsx
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `Laporan_Kehadiran_${dateStr}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Laporan berhasil diunduh!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengexport data");
    } finally {
      setExporting(false);
    }
  };

  // 3. Client-side Search Filter (Sederhana)
  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    return (
      log.user_name.toLowerCase().includes(term) ||
      log.facility_name.toLowerCase().includes(term) ||
      (log.user.profile.identity_number || "").toLowerCase().includes(term)
    );
  });

  // Helper Badge Status
  const renderStatusBadge = (status: string, bookingStatus: string, isCheckedIn: boolean, isCheckedOut: boolean) => {
    // Logika mapping status ke tampilan
    if (status === "on_time") return <Badge className="bg-emerald-500 hover:bg-emerald-600">Tepat Waktu</Badge>;
    if (status === "late") return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Terlambat</Badge>;
    if (status === "no_show") return <Badge variant="destructive">Tidak Hadir</Badge>;
    
    // Status Sedang Berjalan
    if (bookingStatus === "approved" && isCheckedIn && !isCheckedOut) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">Sedang Berjalan</Badge>;
    }
    // Status Belum Hadir (Masih jadwal masa depan/hari ini tapi belum scan)
    if (bookingStatus === "approved" && !isCheckedIn) {
      return <Badge variant="outline" className="text-slate-400 border-slate-600">Belum Hadir</Badge>;
    }

    return <Badge variant="outline">{status || "-"}</Badge>;
  };

  return (
    <div className="space-y-6 p-6 bg-[#020817] min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Log Kehadiran</h1>
          <p className="text-slate-400">Pantau aktivitas check-in dan check-out pengguna fasilitas.</p>
        </div>
        <Button 
          onClick={handleExport} 
          disabled={exporting || logs.length === 0}
          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
        >
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {exporting ? "Mengunduh..." : "Export Excel"}
        </Button>
      </div>

      {/* FILTER CARD */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
          
          {/* Search */}
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-slate-400 ml-1">Cari User / Fasilitas</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Nama, NIM, atau Ruangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-700 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="w-full md:w-auto space-y-2">
             <label className="text-xs font-medium text-slate-400 ml-1">Dari Tanggal</label>
             <Input 
               type="date" 
               className="bg-slate-950 border-slate-700 w-full md:w-[160px] block"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
             />
          </div>
          <div className="w-full md:w-auto space-y-2">
             <label className="text-xs font-medium text-slate-400 ml-1">Sampai Tanggal</label>
             <Input 
               type="date" 
               className="bg-slate-950 border-slate-700 w-full md:w-[160px] block"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
             />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-[180px] space-y-2">
            <label className="text-xs font-medium text-slate-400 ml-1">Status Kehadiran</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-950 border-slate-700">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <SelectValue placeholder="Semua Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="on_time">Tepat Waktu</SelectItem>
                <SelectItem value="late">Terlambat</SelectItem>
                <SelectItem value="no_show">Tidak Hadir (No Show)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* DATA TABLE */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-300">Pengguna</TableHead>
              <TableHead className="text-slate-300">Fasilitas & Jadwal</TableHead>
              <TableHead className="text-slate-300 text-center">Check-In</TableHead>
              <TableHead className="text-slate-300 text-center">Check-Out</TableHead>
              <TableHead className="text-slate-300 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <CalendarDays className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  Tidak ada data kehadiran yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/30">
                  
                  {/* Kolom User */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-700">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${log.user_name}&background=6366f1&color=fff`} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-200">{log.user_name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {log.user.profile.identity_number || "N/A"}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Kolom Fasilitas & Jadwal */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-indigo-400">{log.facility_name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(log.start_time), "dd MMM yyyy", { locale: id })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.start_time), "HH:mm")} - {format(new Date(log.end_time), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>

                  {/* Kolom Check-In */}
                  <TableCell className="text-center">
                    {log.checked_in_at ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono">
                        {format(new Date(log.checked_in_at), "HH:mm")}
                      </Badge>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </TableCell>

                  {/* Kolom Check-Out */}
                  <TableCell className="text-center">
                    {log.checked_out_at ? (
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 font-mono">
                        {format(new Date(log.checked_out_at), "HH:mm")}
                      </Badge>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </TableCell>

                  {/* Kolom Status */}
                  <TableCell className="text-right">
                    {renderStatusBadge(
                      log.attendance_status, 
                      log.status, 
                      !!log.checked_in_at, 
                      !!log.checked_out_at
                    )}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

    </div>
  );
}