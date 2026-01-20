"use client";

import { useState, useMemo } from "react";
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
  onSuccess: () => void; // 🔑 callback refresh
  facilityId: string;
  facilityName: string;
};

export default function BookingModal({
  open,
  onClose,
  onSuccess,
  facilityId,
  facilityName,
}: BookingModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);

  const isTimeInRange = (time: string) =>
    time >= "08:00" && time <= "16:00";

  const isFormValid = useMemo(() => {
    if (!date || !startTime || !endTime) return false;
    if (startTime >= endTime) return false;
    if (!isTimeInRange(startTime)) return false;
    if (!isTimeInRange(endTime)) return false;
    return true;
  }, [date, startTime, endTime]);

  const submitBooking = async () => {
    if (!isFormValid) return;

    try {
      setLoading(true);

      await api.post("/bookings", {
        facility_id: facilityId,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
        purpose,
      });

      toast.success("Booking berhasil diajukan", {
        description: "Menunggu persetujuan admin",
      });

      // reset
      setDate("");
      setStartTime("");
      setEndTime("");
      setPurpose("");

      onClose();
      onSuccess(); // 🔄 trigger refresh parent
    } catch (err) {
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
          <div className="text-sm font-medium">
            {facilityName}
          </div>

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

          {!isFormValid && (
            <p className="text-sm text-muted-foreground">
              Jam booking harus 08.00–16.00 dan jam selesai
              lebih besar dari jam mulai
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={submitBooking}
              disabled={!isFormValid || loading}
            >
              {loading ? "Menyimpan..." : "Ajukan Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
