package booking

import (
	"database/sql"
	"errors"
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

	// INSERT langsung ke DB
	// Semua rule bentrok & jam operasional DIJAGA DB
	if err := Insert(db, b); err != nil {
		// JANGAN ubah error DB
		// Handler akan mapping berdasarkan constraint
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
