package booking

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// ==========================
// CREATE BOOKING (USER)
// ==========================
func CreateBooking(db *sql.DB, b Booking) error {
	// 1. Validasi dasar
	if b.UserID == "" {
		return errors.New("user tidak valid")
	}

	if b.FacilityID == "" {
		return errors.New("fasilitas tidak valid")
	}

	if !b.StartTime.Before(b.EndTime) {
		return errors.New("waktu mulai harus sebelum waktu selesai")
	}

	// ---------------------------------------------------------
	// FITUR BARU: Cek Ketersediaan Spesifik
	// ---------------------------------------------------------
	// Mengecek apakah ada booking lain yang menghalangi di rentang waktu ini
	conflictEndTime, err := FindOverlappingBooking(db, b.FacilityID, b.StartTime, b.EndTime)
	if err != nil {
		return errors.New("gagal mengecek ketersediaan ruangan")
	}

	if conflictEndTime != nil {
		// Jika ada tabrakan, ambil waktu selesainya dan format ke "Jam:Menit" (Contoh: 12:00)
		nextAvailable := conflictEndTime.Format("15:04")
		return fmt.Errorf("ruangan telah terbooking, dapat digunakan lagi setelah pukul %s", nextAvailable)
	}
	// ---------------------------------------------------------

	// 2. Insert booking via Repository
	// Repository akan otomatis set created_by = b.UserID
	err = Insert(db, b)
	if err != nil {
		// Tangani constraint PostgreSQL (sebagai safety net terakhir)
		msg := err.Error()

		if strings.Contains(msg, "no_double_booking") {
			return errors.New("jadwal fasilitas bentrok dengan booking lain")
		}

		if strings.Contains(msg, "no_user_overlap") {
			return errors.New("anda sudah memiliki booking di waktu tersebut")
		}

		return err
	}

	return nil
}

// ==========================
// CANCEL BOOKING (USER)
// Hanya boleh jika status masih pending
// ==========================
func CancelBooking(db *sql.DB, bookingID string, userID string) error {
	// 1. Cek detail booking via Repository
	status, owner, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	// 2. Validasi kepemilikan
	if owner != userID {
		return errors.New("tidak punya hak membatalkan booking ini")
	}

	// 3. Validasi status
	if status != "pending" {
		return errors.New("hanya booking pending yang bisa dibatalkan")
	}

	// 4. Lakukan cancel via Repository (audit updated_by = userID)
	return UpdateStatusCancel(db, bookingID, userID)
}

// ==========================
// APPROVE / REJECT BOOKING (ADMIN)
// ==========================
func UpdateBookingStatus(db *sql.DB, bookingID string, newStatus string, adminID string) error {
	// 1. Validasi input status
	if newStatus != "approved" && newStatus != "rejected" {
		return errors.New("status tidak valid")
	}

	// 2. Cek status saat ini via Repository
	currentStatus, _, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	// 3. Pastikan hanya pending yang bisa diubah
	if currentStatus != "pending" {
		return errors.New("status booking tidak bisa diubah karena sudah diproses")
	}

	// 4. Update status via Repository (audit updated_by = adminID)
	return UpdateStatus(db, bookingID, newStatus, adminID)
}

// ==========================
// GET USER BOOKINGS
// ==========================
func GetUserBookings(db *sql.DB, userID string) ([]Booking, error) {
	// Panggil Repository
	return FindByUserID(db, userID)
}
