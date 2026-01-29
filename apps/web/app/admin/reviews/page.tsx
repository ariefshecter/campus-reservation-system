"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import { 
  Loader2, 
  Search, 
  MessageSquareQuote,
  MapPin,
  Calendar,
  User
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Tipe Data Review
type Review = {
  id: string;
  user_name: string;
  user: {
    profile: {
        avatar_url?: string;
    }
  }
  facility_name: string;
  start_time: string;
  review_comment?: string;
  reviewed_at?: string;
};

// Helper Format Tanggal
const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get<Review[]>("/admin/reviews");
      // Filter hanya yang punya komentar
      const dataWithReviews = (res.data ?? []).filter(item => item.review_comment && item.review_comment !== "");
      setReviews(dataWithReviews);
    } catch (error) {
      console.error("Gagal memuat ulasan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => 
      r.user_name.toLowerCase().includes(search.toLowerCase()) ||
      r.facility_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.review_comment && r.review_comment.toLowerCase().includes(search.toLowerCase()))
    );
  }, [reviews, search]);

  return (
    <div className="space-y-6 p-6 bg-[#020817] min-h-screen text-slate-100">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Ulasan Pengguna</h1>
        <p className="text-slate-400">Pantau masukan dan pengalaman pengguna terhadap fasilitas kampus.</p>
      </div>

      {/* TOOLBAR */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
                placeholder="Cari nama, fasilitas, atau isi ulasan..."
                className="pl-9 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            </div>
            <div className="w-full md:w-auto flex justify-end">
                <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-950 py-1.5 px-3">
                    Total: {filteredReviews.length} Ulasan
                </Badge>
            </div>
        </CardContent>
      </Card>

      {/* TABLE CARD */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
             <MessageSquareQuote className="h-5 w-5 text-indigo-400" />
             Riwayat Ulasan Masuk
          </CardTitle>
          <CardDescription className="text-slate-500">
             Daftar ulasan terbaru dari peminjaman yang telah selesai.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-60 flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" /> 
              <span className="text-sm font-medium">Sedang memuat data...</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3 text-slate-500 m-4">
              <div className="bg-slate-900 p-4 rounded-full border border-slate-800">
                 <MessageSquareQuote className="h-8 w-8 text-slate-600" />
              </div>
              <p>Belum ada ulasan yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-300 font-medium pl-6">Pengguna</TableHead>
                    <TableHead className="text-slate-300 font-medium">Fasilitas</TableHead>
                    <TableHead className="text-slate-300 font-medium w-[45%]">Komentar</TableHead>
                    <TableHead className="text-slate-300 font-medium text-right pr-6">Waktu</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredReviews.map((item) => (
                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                      
                      {/* USER COLUMN */}
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-700">
                            <AvatarImage src={item.user.profile.avatar_url || ""} />
                            <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                              {item.user_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200 text-sm">{item.user_name}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <User className="h-3 w-3 text-slate-500" />
                                <span className="text-xs text-slate-500">User</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* FACILITY COLUMN */}
                      <TableCell>
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-indigo-400 font-medium text-sm">
                                <MapPin className="h-3.5 w-3.5" />
                                {item.facility_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.start_time).split(" pukul")[0]}
                            </div>
                         </div>
                      </TableCell>

                      {/* COMMENT COLUMN */}
                      <TableCell>
                        <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed italic">
                           <MessageSquareQuote className="absolute -top-2.5 -left-2 h-6 w-6 text-indigo-400 bg-slate-900 rounded-full p-0.5 border border-slate-700" />
                           &quot;{item.review_comment}&quot;
                        </div>
                      </TableCell>

                      {/* DATE COLUMN */}
                      <TableCell className="text-right pr-6 text-slate-500 text-xs font-mono">
                        {formatDate(item.reviewed_at)}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}