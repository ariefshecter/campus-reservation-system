package booking

import (
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"time"
)

// generateTicketCode menghasilkan kode unik seperti: TK-20260126-A1B2C
func generateTicketCode() string {
	dateStr := time.Now().Format("20060102")
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, 5)
	for i := range result {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		result[i] = charset[num.Int64()]
	}
	return fmt.Sprintf("TK-%s-%s", dateStr, string(result))
}

// ==========================
// CREATE BOOKING (USER)
// ==========================
func CreateBooking(db *sql.DB, b Booking) error {
	if b.UserID == "" {
		return errors.New("user tidak valid")
	}

	if b.FacilityID == "" {
		return errors.New("fasilitas tidak valid")
	}

	if !b.StartTime.Before(b.EndTime) {
		return errors.New("waktu mulai harus sebelum waktu selesai")
	}

	// 1. CEK BENTROK
	conflictStart, conflictEnd, err := GetConflictingBooking(db, b.FacilityID, b.StartTime, b.EndTime)
	if err != nil {
		return errors.New("gagal mengecek ketersediaan ruangan")
	}

	if conflictStart != nil {
		loc, err := time.LoadLocation("Asia/Jakarta")
		if err != nil {
			loc = time.Local
		}
		tStart := conflictStart.In(loc).Format("02 Jan 2006, 15:04")
		tEnd := conflictEnd.In(loc).Format("15:04")

		return fmt.Errorf("Ruangan sudah dibooking pada: %s - %s WIB. Silakan pilih jam lain.", tStart, tEnd)
	}

	// 2. GENERATE TICKET CODE OTOMATIS
	b.TicketCode = sql.NullString{
		String: generateTicketCode(),
		Valid:  true,
	}
	b.IsCheckedIn = false

	// 3. INSERT KE DATABASE
	if err := Insert(db, b); err != nil {
		return err
	}

	return nil
}

// ==========================
// CANCEL BOOKING (USER)
// ==========================
func CancelBooking(db *sql.DB, bookingID string, userID string) error {
	status, owner, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	if owner != userID {
		return errors.New("tidak punya hak membatalkan booking ini")
	}

	if status != "pending" {
		return errors.New("hanya booking pending yang bisa dibatalkan")
	}

	return UpdateStatusCancel(db, bookingID, userID)
}

// ==========================
// APPROVE / REJECT BOOKING (ADMIN)
// ==========================
func UpdateBookingStatus(db *sql.DB, bookingID string, newStatus string, adminID string) error {
	if newStatus != "approved" && newStatus != "rejected" {
		return errors.New("status tidak valid")
	}

	currentStatus, _, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	if currentStatus != "pending" {
		return errors.New("status booking tidak bisa diubah karena sudah diproses")
	}

	var ticketCode string
	if newStatus == "approved" {
		ticketCode = generateTicketCode()
	}

	return UpdateStatus(db, bookingID, newStatus, adminID, ticketCode)
}

// ==========================
// SCAN TICKET (CHECK-IN & CHECK-OUT)
// ==========================
func CheckInTicket(db *sql.DB, ticketCode string) error {
	// 1. Cari booking berdasarkan kode tiket
	booking, err := FindByTicketCode(db, ticketCode)
	if err != nil {
		return errors.New("kode tiket tidak valid atau tidak ditemukan")
	}

	// 2. Validasi Dasar: Apakah booking disetujui?
	if booking.Status != "approved" {
		return errors.New("tiket tidak valid karena booking belum disetujui")
	}

	// ==========================================
	// ALUR CHECK-OUT (Jika sudah pernah Check-in)
	// ==========================================
	if booking.IsCheckedIn {
		// Validasi: Jika sudah pernah check-out sebelumnya
		if booking.IsCheckedOut {
			return errors.New("tiket ini sudah selesai digunakan (Sudah Check-Out)")
		}

		// Hitung Status Keterlambatan
		now := time.Now()
		gracePeriod := 15 * time.Minute
		deadline := booking.EndTime.Add(gracePeriod)

		checkoutStatus := "on_time"
		if now.After(deadline) {
			checkoutStatus = "late"
		}

		// Update data Check-out di database
		if err := UpdateCheckOut(db, booking.ID, checkoutStatus); err != nil {
			return errors.New("gagal memproses check-out")
		}

		if checkoutStatus == "late" {
			return fmt.Errorf("Check-Out Berhasil! (Terlambat: melewati batas toleransi 15 menit)")
		}
		return nil // Berhasil Tepat Waktu
	}

	// ==========================================
	// ALUR CHECK-IN (Jika belum pernah Check-in)
	// ==========================================
	return UpdateCheckIn(db, booking.ID)
}

// ==========================
// GET USER BOOKINGS
// ==========================
func GetUserBookings(db *sql.DB, userID string) ([]BookingResponse, error) {
	return FindByUserID(db, userID)
}
