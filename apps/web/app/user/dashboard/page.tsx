"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"; 
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingModal from "@/components/booking/booking-modal";

/* =======================
   CONFIG
======================= */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Gunakan placeholder jika foto kosong/error
const FALLBACK_IMAGE = "/room-placeholder.png"; 

/* =======================
   TYPES
======================= */
type Profile = {
  full_name: string;
  phone_number: string;
  identity_number: string;
};

type Facility = {
  id: string;
  name: string;
  capacity: number;
  location: string;
  photo_url: string[];
  is_active: boolean;
};

type Booking = {
  id: string;
  status: "pending" | "approved" | "rejected" | "canceled";
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
   SUB-COMPONENT: CARD WITH SLIDER
======================= */
function FacilityCard({ 
  facility, 
  onBook 
}: { 
  facility: Facility; 
  onBook: (f: Facility) => void 
}) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const photos = Array.isArray(facility.photo_url) && facility.photo_url.length > 0
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

  return (
    <Card className="relative overflow-hidden rounded-2xl bg-slate-100 shadow flex flex-col h-full group/card hover:shadow-lg transition-all duration-300">
      <div className="relative h-44 group bg-slate-200 overflow-hidden">
        {currentSrc ? (
          <Image
            src={resolveImage(currentSrc)}
            alt={`${facility.name} - ${currentImgIndex + 1}`}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        <Badge className="absolute right-3 top-3 bg-slate-900/70 text-slate-100 backdrop-blur-sm border-0">
          {facility.capacity} Org
        </Badge>

        {hasMultiplePhotos && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {photos.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 w-1.5 rounded-full transition-all shadow-sm ${
                    idx === currentImgIndex ? "bg-white w-3" : "bg-white/50"
                  }`} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      <CardContent className="space-y-4 p-5 flex flex-col flex-1">
        <div className="flex-1">
          <p className="font-semibold text-slate-900 line-clamp-1">
            {facility.name}
          </p>
          <p className="text-sm text-slate-600 line-clamp-1">
            {facility.location}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/user/facilities/${facility.id}`} className="w-full" tabIndex={-1}>
             <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-200">
               Detail
             </Button>
          </Link>
          
          <Button
            className={`w-full ${
              facility.is_active 
                ? "bg-slate-900 hover:bg-slate-800" 
                : "bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300"
            }`}
            onClick={() => onBook(facility)}
            disabled={!facility.is_active}
          >
            {facility.is_active ? "Booking" : "Non-Aktif"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* =======================
   PAGE
======================= */
export default function UserDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  
  // PERBAIKAN 1: Tambahkan state loading
  const [isLoading, setIsLoading] = useState(true);

  // booking modal
  const [openBooking, setOpenBooking] = useState(false);
  const [selectedFacility, setSelectedFacility] =
    useState<Facility | null>(null);

  /* =======================
      INITIAL LOAD
  ======================= */
  useEffect(() => {
    (async () => {
      try {
        const [profileRes, facilityRes, bookingRes] =
          await Promise.all([
            api.get<Profile>("/profile"),
            api.get<Facility[]>("/facilities"),
            api.get<Booking[]>("/bookings/me"),
          ]);

        setProfile(profileRes.data);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeFacilities = (facilityRes.data ?? []).map((f: any) => ({
          ...f,
          photo_url: Array.isArray(f.photo_url) ? f.photo_url : []
        }));
        
        setFacilities(safeFacilities);
        setBookings(bookingRes.data ?? []);
      } catch (error) {
        console.error("Gagal memuat dashboard:", error);
      } finally {
        // PERBAIKAN 1: Set loading false setelah fetch selesai (sukses/gagal)
        setIsLoading(false);
      }
    })();
  }, []);

  /* =======================
      REFRESH BOOKINGS ONLY
  ======================= */
  const refreshBookings = async () => {
    const res = await api.get<Booking[]>("/bookings/me");
    setBookings(res.data ?? []);
  };

  /* =======================
      DERIVED STATE
  ======================= */
  // PERBAIKAN 2: Logika pengecekan profil
  // - Cek !isLoading agar tidak muncul saat awal load
  // - Cek keberadaan `profile` object
  // - Gunakan .trim() untuk memastikan string kosong atau spasi dianggap tidak lengkap
  const isProfileIncomplete = !isLoading && profile && (
    !profile.phone_number || 
    profile.phone_number.toString().trim() === "" ||
    !profile.identity_number || 
    profile.identity_number.toString().trim() === ""
  );

  const filteredFacilities = useMemo(() => {
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q)
    );
  }, [search, facilities]);

  const pendingCount = bookings.filter(
    (b) => b.status === "pending"
  ).length;

  const approvedCount = bookings.filter(
    (b) => b.status === "approved"
  ).length;

  /* =======================
      RENDER
  ======================= */
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)] px-6 py-12">
      <div className="mx-auto max-w-7xl space-y-14">

        {/* ===== ALERT ===== */}
        {isProfileIncomplete && (
          <div className="relative overflow-hidden rounded-xl bg-slate-100/95 px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-sm text-slate-800">
              <span>
                Profil Anda belum lengkap. Lengkapi data untuk mempercepat
                persetujuan peminjaman.
              </span>
              <Link href="/user/profile">
                <Button size="sm">
                  Lengkapi Profil
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-100/10 px-12 py-14 backdrop-blur-lg">
          <div className="relative text-center">
            <h1 className="text-2xl font-semibold text-slate-100">
              Halo{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Mau pinjam ruangan apa hari ini?
            </p>

            <div className="mx-auto mt-7 max-w-xl">
              <Input
                placeholder="Cari Aula, Lab Komputer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-100/10 text-slate-100 placeholder:text-slate-400 border-slate-500/30 focus-visible:ring-slate-400"
              />
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-500/15 px-8 py-7 border border-blue-500/20 backdrop-blur-sm">
            <p className="text-sm text-slate-300">Pending</p>
            <p className="mt-3 text-4xl font-semibold text-slate-50">
              {pendingCount}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Menunggu Persetujuan
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-500/15 px-8 py-7 border border-emerald-500/20 backdrop-blur-sm">
            <p className="text-sm text-slate-300">Disetujui</p>
            <p className="mt-3 text-4xl font-semibold text-slate-50">
              {approvedCount}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Booking Aktif
            </p>
          </div>
        </section>

        {/* ===== FACILITY CATALOG ===== */}
        <section>
          <h2 className="mb-6 text-lg font-semibold text-slate-100">
            Katalog Fasilitas
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {filteredFacilities.map((f) => (
              <FacilityCard 
                key={f.id} 
                facility={f} 
                onBook={(facility) => {
                  setSelectedFacility(facility);
                  setOpenBooking(true);
                }} 
              />
            ))}
          </div>
        </section>

        {/* ===== BOOKING MODAL ===== */}
        {selectedFacility && (
          <BookingModal
            open={openBooking}
            onClose={() => setOpenBooking(false)}
            onSuccess={refreshBookings}
            facilityId={selectedFacility.id}
            facilityName={selectedFacility.name}
          />
        )}

      </div>
    </div>
  );
}