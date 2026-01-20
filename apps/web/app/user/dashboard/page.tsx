"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  photo_url: string;
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
   PAGE
======================= */
export default function UserDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");

  // booking modal
  const [openBooking, setOpenBooking] = useState(false);
  const [selectedFacility, setSelectedFacility] =
    useState<Facility | null>(null);

  /* =======================
     INITIAL LOAD
     (eslint-safe)
  ======================= */
  useEffect(() => {
    (async () => {
      const [profileRes, facilityRes, bookingRes] =
        await Promise.all([
          api.get<Profile>("/profile"),
          api.get<Facility[]>("/facilities"),
          api.get<Booking[]>("/bookings/me"),
        ]);

      setProfile(profileRes.data);
      setFacilities(facilityRes.data ?? []);
      setBookings(bookingRes.data ?? []);
    })();
  }, []);

  /* =======================
     REFRESH BOOKINGS ONLY
     (dipanggil setelah booking sukses)
  ======================= */
  const refreshBookings = async () => {
    const res = await api.get<Booking[]>("/bookings/me");
    setBookings(res.data ?? []);
  };

  /* =======================
     DERIVED STATE
  ======================= */
  const isProfileIncomplete =
    !profile?.phone_number || !profile?.identity_number;

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
              />
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-500/15 px-8 py-7">
            <p className="text-sm text-slate-300">Pending</p>
            <p className="mt-3 text-4xl font-semibold text-slate-50">
              {pendingCount}
            </p>
            <p className="text-sm text-slate-300">
              Menunggu Persetujuan
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-500/15 px-8 py-7">
            <p className="text-sm text-slate-300">Disetujui</p>
            <p className="mt-3 text-4xl font-semibold text-slate-50">
              {approvedCount}
            </p>
            <p className="text-sm text-slate-300">
              Booking Aktif
            </p>
          </div>
        </section>

        {/* ===== FACILITY ===== */}
        <section>
          <h2 className="mb-6 text-lg font-semibold text-slate-100">
            Katalog Fasilitas
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {filteredFacilities.map((f) => (
              <Card
                key={f.id}
                className="relative overflow-hidden rounded-2xl bg-slate-100 shadow"
              >
                <div className="relative h-44">
                  <Image
                    src={resolveImage(f.photo_url)}
                    alt={f.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute right-3 top-3 bg-slate-900/70 text-slate-100">
                    {f.capacity} Org
                  </Badge>
                </div>

                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {f.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {f.location}
                    </p>
                  </div>

                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    onClick={() => {
                      setSelectedFacility(f);
                      setOpenBooking(true);
                    }}
                  >
                    Booking Sekarang
                  </Button>
                </CardContent>
              </Card>
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
