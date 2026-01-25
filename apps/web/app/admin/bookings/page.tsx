"use client"

import { useEffect, useState, useCallback, ReactNode } from "react"
import { toast } from "sonner"
import { 
  Check, 
  X, 
  Clock, 
  Calendar, 
  User, 
  Building, 
  UserCheck, 
  Eye, 
  MapPin, 
  Phone, 
  Building2, 
  UserCircle2, 
  Mail 
} from "lucide-react"
import { AxiosError } from "axios"
import api from "@/lib/axios"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// =======================
// TYPES
// =======================

type ProfileData = {
  full_name: string
  phone_number: string
  address: string
  avatar_url: string
  gender: string
  identity_number: string
  department: string
  position: string
}

type BookingUser = {
  id: string
  name: string
  email: string
  profile?: ProfileData
}

type Booking = {
  id: string
  user_name: string
  // Objek user (bisa ada, bisa tidak dari backend)
  user?: BookingUser 
  facility_name: string
  start_time: string
  end_time: string
  status: string
  purpose: string
  created_at: string
  admin_name: string
}

type ErrorResponse = {
  error: string
}

type InfoProps = {
  icon: ReactNode
  label: string
  value?: string
}

// =======================
// HELPER COMPONENTS
// =======================

function Info({ icon, label, value }: InfoProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-slate-800 break-words leading-snug">
          {value || "-"}
        </p>
      </div>
    </div>
  )
}

// =======================
// MAIN COMPONENT
// =======================

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  
  const BACKEND_URL = "http://localhost:3000"

  const getAvatarUrl = (path?: string) =>
    path ? (path.startsWith("http") ? path : `${BACKEND_URL}${path}`) : undefined

  const getInitials = (name: string) =>
    name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??"

  /* =======================
      FETCH BOOKINGS (MODIFIED FOR TESTING)
  ======================= */
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = filter === "all" ? "" : filter
      const res = await api.get(`/bookings?status=${statusParam}`)
      
      // 🔥 MODIFIKASI: INJECT DUMMY DATA JIKA USER KOSONG
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bookingsWithDummyUser = res.data.map((booking: any) => ({
        ...booking,
        // Jika backend tidak kirim objek 'user', kita buat dummy
        user: booking.user || {
            id: "dummy-id",
            name: booking.user_name, // Pakai nama dari booking
            email: "mahasiswa@campus.ac.id", // Email dummy
            profile: {
                full_name: booking.user_name + " (Lengkap)",
                identity_number: "19283746", // NIM Dummy
                department: "Teknik Informatika",
                position: "Mahasiswa",
                gender: "L",
                phone_number: "0812-3456-7890",
                address: "Jl. Pagar Alam No. 12, Kedaton, Bandar Lampung",
                avatar_url: "" // Kosongkan biar pakai inisial
            }
        }
      }))

      setBookings(bookingsWithDummyUser)
      
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat data booking")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  /* =======================
      APPROVE / REJECT
  ======================= */
  const handleUpdateStatus = async (
    id: string,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      await api.patch(`/bookings/${id}/status`, {
        status: newStatus,
      })

      toast.success(
        `Booking berhasil ${
          newStatus === "approved" ? "disetujui" : "ditolak"
        }`
      )

      fetchBookings()

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("admin-booking-updated"))
      }

    } catch (err) {
      const error = err as AxiosError<ErrorResponse>
      toast.error(
        error.response?.data?.error || "Gagal mengupdate status"
      )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  /* =======================
      RENDER
  ======================= */
  return (
    <div className="min-h-screen bg-white p-6 md:p-10 space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Manajemen Booking
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola persetujuan peminjaman ruangan kampus.
        </p>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex space-x-2 pb-2">
        {["pending", "approved", "rejected", "all"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                filter === status
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              {status === "all"
                ? "Semua"
                : status === "pending"
                ? "Perlu Persetujuan"
                : status === "approved"
                ? "Disetujui"
                : "Ditolak"}
            </button>
          )
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        
        {/* HEADER TABEL INFO */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">
                Daftar Permintaan <span className="text-slate-400 font-normal">({bookings.length})</span>
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wide">
               Status: {filter === "all" ? "SEMUA" : filter}
            </span>
        </div>

        {/* CONTENT */}
        <div className="p-0">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
               <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
               <p className="text-sm">Memuat data booking...</p>
             </div>
          ) : bookings.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
               <div className="p-3 bg-slate-50 rounded-full">
                  <Calendar className="h-6 w-6 text-slate-300" />
               </div>
               <p className="text-sm italic">Tidak ada data booking ditemukan.</p>
             </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-200">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="pl-6 text-slate-700 font-semibold">Peminjam</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Fasilitas</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Waktu & Keperluan</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-slate-700 font-semibold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0">
                    
                    {/* KOLOM PEMINJAM + POPUP PROFILE */}
                    <TableCell className="pl-6 py-4 align-top">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{item.user_name}</span>

                        {/* FITUR POPUP PROFIL USER */}
                        {item.user && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full ml-1"
                                        title="Lihat Profil"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                </DialogTrigger>
                                
                                <DialogContent className="max-w-[380px] p-0 rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 bg-white">
                                    <DialogTitle className="sr-only">Profil Peminjam</DialogTitle>
                                    
                                    {/* Header Abu-abu */}
                                    <div className="bg-slate-50/50 px-6 py-8 text-center border-b border-slate-100">
                                        <Avatar className="h-24 w-24 mx-auto mb-3 border-[4px] border-white shadow-md bg-white rounded-full">
                                            <AvatarImage 
                                                src={getAvatarUrl(item.user.profile?.avatar_url)} 
                                                className="object-cover h-full w-full"
                                            />
                                            <AvatarFallback className="bg-slate-200 text-slate-500 text-2xl">
                                                {getInitials(item.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        
                                        <h2 className="text-lg font-bold text-slate-900 leading-tight px-4">
                                            {item.user.profile?.full_name || item.user.name}
                                        </h2>
                                        
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-[10px] text-slate-500 font-medium px-2 h-5 bg-white border-slate-200">
                                                {item.user.profile?.identity_number || "NIM Tidak Ada"}
                                            </Badge>
                                            <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 px-2 h-5 shadow-none font-medium">
                                                {item.user.profile?.position || "Mahasiswa"}
                                            </Badge>
                                        </div>
                                        <DialogDescription className="sr-only">Detail profil peminjam</DialogDescription>
                                    </div>

                                    {/* Body Info */}
                                    <div className="p-6 space-y-5 bg-white">
                                        <Info 
                                            icon={<Building2 className="w-4 h-4" />} 
                                            label="Jurusan" 
                                            value={item.user.profile?.department} 
                                        />
                                        <Info 
                                            icon={<UserCircle2 className="w-4 h-4" />} 
                                            label="Jenis Kelamin" 
                                            value={item.user.profile?.gender === 'L' ? 'Laki-laki' : item.user.profile?.gender === 'P' ? 'Perempuan' : item.user.profile?.gender} 
                                        />
                                        <Info 
                                            icon={<Phone className="w-4 h-4" />} 
                                            label="Telepon" 
                                            value={item.user.profile?.phone_number} 
                                        />
                                        <Info 
                                            icon={<Mail className="w-4 h-4" />} 
                                            label="Email Akun" 
                                            value={item.user.email} 
                                        />
                                        <Info 
                                            icon={<MapPin className="w-4 h-4" />} 
                                            label="Alamat Domisili" 
                                            value={item.user.profile?.address} 
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                      </div>
                    </TableCell>

                    {/* KOLOM FASILITAS */}
                    <TableCell className="py-4 align-top">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Building className="h-4 w-4 text-slate-400" />
                        {item.facility_name}
                      </div>
                    </TableCell>

                    {/* KOLOM WAKTU */}
                    <TableCell className="py-4 align-top">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(item.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-0 text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-xs bg-slate-100 px-1 rounded">
                              {new Date(item.start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-slate-400">-</span>
                          <span className="font-mono text-xs bg-slate-100 px-1 rounded">
                              {new Date(item.end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded w-fit max-w-[200px] truncate">
                          &quot;{item.purpose}&quot;
                        </div>
                      </div>
                    </TableCell>

                    {/* KOLOM STATUS */}
                    <TableCell className="py-4 align-top">
                      <div className="flex flex-col items-start gap-1">
                          {item.status === "approved" && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-none font-medium">
                              Disetujui
                            </Badge>
                          )}
                          {item.status === "pending" && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 shadow-none font-medium">
                              Pending
                            </Badge>
                          )}
                          {item.status === "rejected" && (
                            <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-none font-medium">
                              Ditolak
                            </Badge>
                          )}
                          {item.status === "canceled" && (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 shadow-none font-medium">
                              Batal
                            </Badge>
                          )}
                          {item.status === "completed" && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-none font-medium">
                              Selesai
                            </Badge>
                          )}

                          {(item.status === "approved" || item.status === "rejected") && item.admin_name && (
                            <div className="flex items-center text-[10px] text-slate-400 mt-1 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                               <UserCheck className="mr-1 h-3 w-3" />
                               {item.admin_name}
                            </div>
                          )}
                      </div>
                    </TableCell>

                    {/* KOLOM AKSI */}
                    <TableCell className="py-4 pr-6 align-top text-right">
                      {item.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                            onClick={() => handleUpdateStatus(item.id, "approved")}
                            title="Setujui Booking"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all"
                            onClick={() => handleUpdateStatus(item.id, "rejected")}
                            title="Tolak Booking"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wide">
                          - Selesai -
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}