"use client";

import { useState } from "react";
import api from "@/lib/axios";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type BookingModalProps = {
  open: boolean;
  onClose: () => void;
  facilityId: string;
  facilityName: string;
};

export default function BookingModal({
  open,
  onClose,
  facilityId,
  facilityName,
}: BookingModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBooking = async () => {
    setError(null);

    if (!date || !startTime || !endTime) {
      setError("Tanggal dan jam wajib diisi");
      return;
    }

    if (startTime >= endTime) {
      setError("Jam mulai harus lebih awal dari jam selesai");
      return;
    }

    const start = `${date}T${startTime}:00`;
    const end = `${date}T${endTime}:00`;


    try {
      setLoading(true);

      await api.post("/bookings", {
        facility_id: facilityId,
        start_time: start,
        end_time: end,
        purpose,
      });

      // ✅ TOAST SUKSES
      toast.success("Booking berhasil diajukan", {
        description: "Menunggu persetujuan admin",
      });

      // Reset form (opsional tapi profesional)
      setDate("");
      setStartTime("");
      setEndTime("");
      setPurpose("");

      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error("Gagal membuat booking", {
          description:
            err.response?.data?.error ?? "Terjadi kesalahan",
        });
      } else {
        toast.error("Terjadi kesalahan tidak terduga");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Ruangan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm font-medium">{facilityName}</div>

          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              min="08:00"
              max="16:00"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              type="time"
              min="08:00"
              max="16:00"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Textarea
            placeholder="Keperluan penggunaan ruangan"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={submitBooking} disabled={loading}>
              {loading ? "Menyimpan..." : "Ajukan Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
