"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingModal from "@/components/booking/booking-modal";

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

/* =======================
   PAGE COMPONENT
======================= */
export default function FacilityDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [openBooking, setOpenBooking] = useState(false);

  /* =======================
     FETCH DATA
  ======================= */
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        
        {/* ===== LAYOUT UTAMA: SIDE BY SIDE (FOTO KIRI, INFO KANAN) ===== */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* KOLOM KIRI: IMAGE SLIDER */}
          <div className="w-full">
            <div className="group relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/5">
              
              {currentSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedUrl}
                  alt={facility.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
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
                  
                  {/* DOTS INDICATOR (.-..) */}
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
                <Badge className={`backdrop-blur-md border-0 px-3 py-1 text-xs font-medium shadow-sm ${
                    facility.is_active 
                      ? "bg-emerald-500/80 text-white" 
                      : "bg-red-500/80 text-white"
                }`}>
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
          </div>

          {/* KOLOM KANAN: INFO & BOOKING */}
          <div className="flex flex-col h-full space-y-8">
            
            {/* 1. Header Info */}
            <div>
              {/* NAMA RUANGAN (Diperbesar) */}
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
                {facility.name}
              </h1>
              
              {/* DETAILS (Jarak diperlebar mb-6) */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2 text-indigo-300 bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{facility.location || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/10">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Kapasitas {facility.capacity}</span>
                </div>
              </div>
            </div>
            
            {/* 2. Deskripsi */}
            <div className="space-y-3 flex-grow">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" /> 
                Deskripsi
              </h3>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base font-light bg-slate-900/30 p-4 rounded-xl border border-white/5">
                {facility.description || "Tidak ada deskripsi yang tersedia."}
              </div>
            </div>

            {/* 3. Booking Action (Bottom aligned) */}
            <div className="pt-6 border-t border-white/10">
              <div className="flex items-center justify-between gap-6">
                
                {/* Harga (Diperkecil) */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Harga Sewa</p>
                  <span className="text-2xl font-bold text-white">
                    {facility.price > 0 ? `Rp${facility.price.toLocaleString("id-ID")}` : "Gratis"}
                  </span>
                </div>

                {/* Tombol Booking (Tanpa Icon, Ukuran pas) */}
                <Button
                  className={`px-8 h-12 font-semibold rounded-lg shadow-md transition-all active:scale-95 text-base ${
                    facility.is_active
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                  }`}
                  onClick={() => setOpenBooking(true)}
                  disabled={!facility.is_active}
                >
                  {facility.is_active ? "Booking" : "Tidak Aktif"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <BookingModal
        open={openBooking}
        onClose={() => setOpenBooking(false)}
        onSuccess={() => router.push("/user/dashboard")}
        facilityId={facility.id}      
        facilityName={facility.name}
      />
    </div>
  );
}