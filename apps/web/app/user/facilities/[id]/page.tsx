"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Share2,
  Info,
  Building2,
  Loader2,
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import BookingModal from "@/components/booking/booking-modal";

/* =======================
   CONFIG
======================= */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const FALLBACK_IMAGE = "/room-placeholder.png";

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
   HELPERS
======================= */
function resolveImage(src: string): string {
  if (!src || src.trim() === "") return FALLBACK_IMAGE;
  if (src.startsWith("http")) return src;
  return `${BACKEND_URL}${src}`;
}

/* =======================
   PAGE
======================= */
export default function FacilityDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);

  // slider state
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // booking modal
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
     SLIDER DERIVED STATE
  ======================= */
  const photos =
    facility?.photo_url && facility.photo_url.length > 0
      ? facility.photo_url
      : [];

  const hasMultiplePhotos = photos.length > 1;
  const currentSrc = photos.length > 0 ? photos[currentImgIndex] : "";

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
     LOADING STATE
  ======================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  /* =======================
     NOT FOUND
  ======================= */
  if (!facility) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center text-slate-400 gap-4">
        <p>Fasilitas tidak ditemukan.</p>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-slate-700 hover:bg-slate-800 text-slate-300"
        >
          Kembali
        </Button>
      </div>
    );
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-20 font-sans">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-50 bg-[#020817]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/user/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <span className="font-medium text-sm text-slate-200 truncate max-w-[200px] sm:max-w-md">
              {facility.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-10">
        {/* ===== SECTION 1: IMAGE SLIDER ===== */}
        <div className="relative w-full h-64 md:h-96 lg:h-[520px] bg-[#0f172a] rounded-3xl overflow-hidden border border-white/5 shadow-2xl group">
          {currentSrc ? (
            <Image
              src={resolveImage(currentSrc)}
              alt={`${facility.name} - ${currentImgIndex + 1}`}
              fill
              priority
              unoptimized
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <Building2 className="w-10 h-10 opacity-50" />
              <p className="text-sm font-medium tracking-wide">
                TIDAK ADA FOTO
              </p>
            </div>
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Slider Controls */}
          {hasMultiplePhotos && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                      idx === currentImgIndex
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== SECTION 2: CONTENT ===== */}
        <div className="grid lg:grid-cols-12 gap-10">
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {facility.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {facility.location || "Lokasi tidak tersedia"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {facility.capacity} Orang
                  </span>
                </div>

                <Badge
                  className={`border py-1.5 ${
                    facility.is_active
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                  }`}
                >
                  {facility.is_active ? "Tersedia" : "Non-Aktif"}
                </Badge>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                Deskripsi
              </h3>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base font-light bg-white/5 p-6 rounded-2xl border border-white/5">
                {facility.description ||
                  "Belum ada deskripsi untuk fasilitas ini."}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-1">
                  Harga Sewa
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-white">
                    {facility.price > 0
                      ? `Rp ${facility.price.toLocaleString("id-ID")}`
                      : "Gratis"}
                  </span>
                  {facility.price > 0 && (
                    <span className="text-xs text-slate-500 mb-1.5">
                      /kegiatan
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                className={`w-full font-semibold h-12 text-base shadow-lg transition-transform active:scale-95 ${
                  facility.is_active
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
                onClick={() => setOpenBooking(true)}
                disabled={!facility.is_active}
              >
                <CalendarCheck className="w-5 h-5 mr-2" />
                {facility.is_active
                  ? "Ajukan Booking"
                  : "Fasilitas Non-Aktif"}
              </Button>

              <p className="text-[10px] text-center text-slate-500 mt-4 leading-relaxed">
                Dengan menekan tombol booking, Anda setuju dengan syarat
                dan ketentuan peminjaman fasilitas kampus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOOKING MODAL ===== */}
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
