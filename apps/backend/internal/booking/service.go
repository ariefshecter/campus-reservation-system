package booking

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// ==========================
// CREATE BOOKING (USER)
// ==========================
func CreateBooking(db *sql.DB, b Booking) error {
	// Validasi dasar (bukan policy)
	if b.UserID == "" {
		return errors.New("user tidak valid")
	}

	if b.FacilityID == "" {
		return errors.New("fasilitas tidak valid")
	}

	if !b.StartTime.Before(b.EndTime) {
		return errors.New("waktu mulai harus sebelum waktu selesai")
	}

	// 1. CEK DULU APAKAH ADA BENTROK?
	// Memanggil fungsi dari repository untuk mencari booking approved yang beririsan
	conflictStart, conflictEnd, err := GetConflictingBooking(db, b.FacilityID, b.StartTime, b.EndTime)
	if err != nil {
		return errors.New("gagal mengecek ketersediaan ruangan")
	}

	// Jika conflictStart tidak nil, berarti ada bentrok
	if conflictStart != nil {
		// Format waktu ke WIB (Asia/Jakarta) untuk pesan error
		loc, err := time.LoadLocation("Asia/Jakarta")
		if err != nil {
			// Fallback ke Local jika timezone tidak ditemukan
			loc = time.Local
		}

		// Format tampilan: "22 Jan 2026, 10:00"
		tStart := conflictStart.In(loc).Format("02 Jan 2006, 15:04")
		tEnd := conflictEnd.In(loc).Format("15:04")

		// Return error spesifik yang akan ditangkap di handler
		return fmt.Errorf("Ruangan sudah dibooking pada: %s - %s WIB. Silakan pilih jam lain.", tStart, tEnd)
	}

	// 2. JIKA AMAN, BARU INSERT
	// Semua rule bentrok & jam operasional tetap dijaga DB sebagai pertahanan lapis kedua
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

	// DB akan menangani bentrok saat approve (jika ada)
	return UpdateStatus(db, bookingID, newStatus, adminID)
}

// ==========================
// GET USER BOOKINGS
// ==========================
func GetUserBookings(db *sql.DB, userID string) ([]BookingResponse, error) {
	return FindByUserID(db, userID)
}
