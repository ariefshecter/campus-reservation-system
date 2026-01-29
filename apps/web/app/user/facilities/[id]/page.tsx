"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, isSameDay, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeft,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Clock,
  Share2,
  ExternalLink
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingModal from "@/components/booking/booking-modal";
import { Card, CardContent } from "@/components/ui/card";

/* =======================
   CONFIG & HELPERS
======================= */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const FALLBACK_IMAGE = "/room-placeholder.png";

function resolveImage(src: string): string {
  if (!src || src.trim() === "") return FALLBACK_IMAGE;
  if (src.startsWith("http")) return src;
  const safeBackend = BACKEND_URL.replace(/\/$/, "");
  const safeSrc = src.startsWith("/") ? src : `/${src}`;
  return `${safeBackend}${safeSrc}`.replace(/ /g, "%20");
}

/* =======================
   TYPES
======================= */
type Facility = {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  price: number;
  photo_url: string[];
  is_active: boolean;
};

type BookingSchedule = {
  id: string;
  start_time: string;
  end_time: string;
  actual_end_time?: string;
  status: string;
  attendance_status?: string;
  user_name: string;
};

/* =======================
   PAGE COMPONENT
======================= */
export default function FacilityDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [schedules, setSchedules] = useState<BookingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [openBooking, setOpenBooking] = useState(false);

  /* =======================
     FETCH DATA
  ======================= */
  const fetchFacility = useCallback(async () => {
    try {
      const res = await api.get(`/facilities/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = res.data as any;
      const safeData: Facility = {
        ...raw,
        photo_url: Array.isArray(raw.photo_url) ? raw.photo_url : [],
      };
      setFacility(safeData);
    } catch (err) {
      console.error("Gagal memuat detail fasilitas:", err);
    }
  }, [id]);

  const fetchSchedules = useCallback(async () => {
    try {
      // Menggunakan endpoint khusus jadwal
      const res = await api.get(`/facilities/${id}/schedule`);
      const allBookings = res.data as BookingSchedule[];
      
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      const filtered = allBookings.filter(b => {
        const bookingDate = new Date(b.start_time);
        
        // Cek apakah tanggal booking sama dengan hari ini ATAU besok
        const isToday = isSameDay(bookingDate, today);
        const isTomorrow = isSameDay(bookingDate, tomorrow);

        // Filter: HANYA yang sudah diterima (approved) atau selesai (completed)
        // Pending tidak ditampilkan lagi.
        const isValidStatus = ['approved', 'completed'].includes(b.status);

        return (isToday || isTomorrow) && isValidStatus;
      });

      setSchedules(filtered);
    } catch (err) {
      console.error("Gagal memuat jadwal:", err);
    }
  }, [id]);

  // Initial Load
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFacility(), fetchSchedules()]);
      setLoading(false);
    };

    loadData();
  }, [id, fetchFacility, fetchSchedules]);

  // Auto Refresh Jadwal setiap 60 detik (Real-time update)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSchedules();
    }, 60000); 
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  /* =======================
     SLIDER LOGIC
  ======================= */
  const photos = facility?.photo_url ?? [];
  const hasMultiplePhotos = photos.length > 1;
  const currentSrc = photos.length > 0 ? photos[currentImgIndex] : "";
  const resolvedUrl = resolveImage(currentSrc);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  /* =======================
     RENDER LOADING
  ======================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  /* =======================
     RENDER NOT FOUND
  ======================= */
  if (!facility) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center text-slate-400 gap-4">
        <Building2 className="w-16 h-16 opacity-20" />
        <p className="text-lg font-medium">Fasilitas tidak ditemukan.</p>
        <Button onClick={() => router.back()} variant="outline" className="border-slate-700 hover:bg-slate-800">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-20 font-sans selection:bg-indigo-500/30">
      
      {/* ===== HEADER NAVIGASI ===== */}
      <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#020817]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/user/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <span className="font-semibold text-slate-200 truncate max-w-[200px]">
              {facility.name}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-9 w-9">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        
        {/* ===== LAYOUT UTAMA: SIDE BY SIDE ===== */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* KOLOM KIRI: IMAGE SLIDER */}
          <div className="w-full">
            <div className="group relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/5">
              
              {currentSrc ? (
                 // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedUrl}
                  alt={facility.name}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                  <Building2 className="w-16 h-16 opacity-30" />
                  <p className="text-xs font-medium tracking-widest opacity-60 uppercase">Foto Tidak Tersedia</p>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Controls */}
              {hasMultiplePhotos && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* DOTS INDICATOR */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full border border-white/5">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(idx); }}
                        className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                          idx === currentImgIndex ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <Badge className={`backdrop-blur-md border-0 px-3 py-1 text-xs font-medium shadow-sm ${facility.is_active ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                    {facility.is_active ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> Tersedia</> : <><XCircle className="w-3.5 h-3.5 mr-1.5"/> Non-Aktif</>}
                </Badge>
              </div>
            </div>
            
             {/* Link Debugging Gambar */}
             <div className="pt-3 flex justify-end opacity-30 hover:opacity-100 transition-opacity">
               <a href={resolvedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-400 hover:underline uppercase tracking-wider">
                  <ExternalLink className="w-3 h-3" /> Lihat Gambar Asli
               </a>
             </div>

            {/* Info Facility */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-4">{facility.name}</h1>
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 text-indigo-300 bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-sm"><MapPin className="w-4 h-4" /> {facility.location}</div>
                <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/10 text-sm"><Users className="w-4 h-4" /> Kapasitas {facility.capacity}</div>
              </div>
              <div className="text-slate-300 leading-relaxed text-sm bg-slate-900/30 p-4 rounded-xl border border-white/5">
                {facility.description || "Tidak ada deskripsi."}
              </div>
            </div>
          </div>

          {/* === KANAN: JADWAL & BOOKING === */}
          <div className="flex flex-col h-full space-y-6">
            
            {/* Jadwal Section */}
            <Card className="bg-slate-900/50 border-white/10 flex-1 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                     <CalendarDays className="w-4 h-4 text-indigo-400" />
                     Jadwal Penggunaan
                  </h3>
                  <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px]">
                     Hari Ini & Besok
                  </Badge>
               </div>
               
               <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {schedules.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                        <CalendarDays className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Belum ada jadwal.</p>
                     </div>
                  ) : (
                     <div className="divide-y divide-white/5">
                        {schedules.map((sch) => {
                           const isCompletedEarly = sch.status === 'completed' && sch.actual_end_time;
                           const displayEndTime = isCompletedEarly ? sch.actual_end_time : sch.end_time;

                           return (
                              <div key={sch.id} className="p-4 hover:bg-white/5 transition-colors">
                                 <div className="flex justify-between items-center mb-2">
                                    {/* STATUS BADGE DISEDERHANAKAN */}
                                    <Badge variant="outline" className={`
                                       text-[10px] px-2 py-0.5 border-0 font-medium
                                       ${sch.status === 'approved' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700/50 text-slate-400'}
                                    `}>
                                       {sch.status === 'approved' ? 'Terisi' : 'Selesai'}
                                    </Badge>
                                    
                                    <span className="text-xs text-slate-500">
                                       {format(new Date(sch.start_time), "dd MMM", { locale: idLocale })}
                                    </span>
                                 </div>
                                 
                                 <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <div className="text-sm font-medium text-slate-200">
                                       {format(new Date(sch.start_time), "HH:mm")} - {format(new Date(displayEndTime!), "HH:mm")}
                                       {isCompletedEarly && <span className="text-[10px] text-emerald-400 ml-2">(Checkout Awal)</span>}
                                    </div>
                                 </div>
                                 
                                 {/* NAMA USER DIHILANGKAN UNTUK PRIVASI */}
                              </div>
                           )
                        })}
                     </div>
                  )}
               </CardContent>
            </Card>

            {/* Booking Action */}
            <div className="p-6 bg-indigo-950/20 rounded-xl border border-indigo-500/20">
              <div className="flex justify-between items-end">
                 <div>
                    <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">Biaya Sewa</p>
                    <span className="text-3xl font-bold text-white">
                      {facility.price > 0 ? `Rp${facility.price.toLocaleString("id-ID")}` : "Gratis"}
                    </span>
                 </div>
                 <Button
                    size="lg"
                    className={`font-semibold shadow-xl shadow-indigo-900/20 ${!facility.is_active ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    onClick={() => setOpenBooking(true)}
                    disabled={!facility.is_active}
                  >
                    {facility.is_active ? "Booking Sekarang" : "Tidak Aktif"}
                  </Button>
              </div>
            </div>
            
          </div>
        </div>
      </main>

      <BookingModal
        open={openBooking}
        onClose={() => setOpenBooking(false)}
        onSuccess={() => {
           setOpenBooking(false);
           fetchSchedules(); // Refresh jadwal setelah booking
           router.refresh();
        }}
        facilityId={facility.id}      
        facilityName={facility.name}
      />
    </div>
  );
}