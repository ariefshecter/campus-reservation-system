package facility

import (
	"database/sql"
	"errors"
)

// ==========================
// CREATE FASILITAS (LOGIKA)
// ==========================
func CreateFacility(db *sql.DB, f Facility) error {
	// Validasi bisnis
	if f.Name == "" {
		return errors.New("nama fasilitas wajib diisi")
	}

	if f.Capacity <= 0 {
		return errors.New("kapasitas harus lebih dari 0")
	}

	// Harga boleh 0 (gratis), tapi tidak boleh negatif
	if f.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}

	// Panggil repository
	return Insert(db, f)
}

// ==========================
// GET LIST FASILITAS
// ==========================
func GetAllFacilities(db *sql.DB) ([]Facility, error) {
	return FindAllActive(db)
}
