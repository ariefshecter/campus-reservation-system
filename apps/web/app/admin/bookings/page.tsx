"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Check, X, Clock, Calendar, User, Building } from "lucide-react"
import { AxiosError } from "axios"
import api from "@/lib/axios"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// =======================
// TYPES
// =======================
type Booking = {
  id: string
  user_name: string
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")

  /* =======================
     FETCH BOOKINGS
  ======================= */
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = filter === "all" ? "" : filter
      const res = await api.get(`/bookings?status=${statusParam}`)
      setBookings(res.data)
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
     🔥 EVENT DISPATCH DI SINI
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

      // 🔄 refresh halaman booking admin
      fetchBookings()

      // 🔥 PENTING: trigger refresh dashboard admin
      window.dispatchEvent(
        new Event("admin-booking-updated")
      )

    } catch (err) {
      const error = err as AxiosError<ErrorResponse>
      toast.error(
        error.response?.data?.error ||
          "Gagal mengupdate status"
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Manajemen Booking
        </h1>
        <p className="text-slate-500">
          Kelola persetujuan peminjaman ruangan kampus
        </p>
      </div>

      {/* FILTER */}
      <div className="flex space-x-2 border-b pb-2">
        {["pending", "approved", "rejected", "all"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border"
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

      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Permintaan ({bookings.length})
          </CardTitle>
          <CardDescription>
            Menampilkan booking dengan status:{" "}
            <span className="font-semibold uppercase">
              {filter === "all" ? "SEMUA" : filter}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">
              Memuat data...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              Tidak ada data booking.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Fasilitas</TableHead>
                  <TableHead>Waktu & Keperluan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <User className="h-4 w-4 text-slate-400" />
                        {item.user_name}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        {item.facility_name}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.start_time)} s/d
                        </div>
                        <div className="flex items-center gap-1 ml-4 text-slate-600">
                          <Clock className="h-3 w-3" />
                          {new Date(
                            item.end_time
                          ).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-slate-500 italic mt-1 bg-slate-100 p-1 rounded w-fit">
                          &quot;{item.purpose}&quot;
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.status === "approved" && (
                        <Badge className="bg-green-100 text-green-700">
                          Disetujui
                        </Badge>
                      )}
                      {item.status === "pending" && (
                        <Badge className="bg-orange-100 text-orange-700">
                          Pending
                        </Badge>
                      )}
                      {item.status === "rejected" && (
                        <Badge className="bg-red-100 text-red-700">
                          Ditolak
                        </Badge>
                      )}
                      {item.status === "canceled" && (
                        <Badge className="bg-slate-100 text-slate-700">
                          Batal
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {item.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-green-500 text-green-600"
                            onClick={() =>
                              handleUpdateStatus(
                                item.id,
                                "approved"
                              )
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-red-500 text-red-600"
                            onClick={() =>
                              handleUpdateStatus(
                                item.id,
                                "rejected"
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Selesai
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
