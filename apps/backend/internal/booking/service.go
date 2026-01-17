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
	// FITUR: Cek Ketersediaan Spesifik
	// ---------------------------------------------------------
	conflictEndTime, err := FindOverlappingBooking(db, b.FacilityID, b.StartTime, b.EndTime)
	if err != nil {
		return errors.New("gagal mengecek ketersediaan ruangan")
	}

	if conflictEndTime != nil {
		// Jika ada tabrakan, ambil waktu selesainya
		nextAvailable := conflictEndTime.Format("15:04")
		return fmt.Errorf("ruangan telah terbooking, dapat digunakan lagi setelah pukul %s", nextAvailable)
	}
	// ---------------------------------------------------------

	// 2. Insert booking via Repository
	err = Insert(db, b)
	if err != nil {
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

	return UpdateStatus(db, bookingID, newStatus, adminID)
}

// ==========================
// GET USER BOOKINGS
// ==========================

func GetUserBookings(db *sql.DB, userID string) ([]BookingResponse, error) {
	return FindByUserID(db, userID)
}
