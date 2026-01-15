package facility

import (
	"database/sql"
	"errors"
)

// ==========================
// CREATE FASILITAS (LOGIKA)
// ==========================
func CreateFacility(db *sql.DB, f Facility, userID string) error {
	// 1. Validasi bisnis
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

	// 2. Panggil repository dengan userID untuk audit created_by
	return Insert(db, f, userID)
}

// ==========================
// GET LIST FASILITAS
// ==========================
func GetAllFacilities(db *sql.DB) ([]Facility, error) {
	// Tidak butuh validasi khusus untuk read public
	return FindAllActive(db)
}

// ==========================
// UPDATE FASILITAS (LOGIKA)
// ==========================
func UpdateFacility(db *sql.DB, id string, f Facility, userID string) error {
	// 1. Validasi ID
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	// 2. Validasi Data (sama seperti Create)
	if f.Name == "" {
		return errors.New("nama fasilitas wajib diisi")
	}

	if f.Capacity <= 0 {
		return errors.New("kapasitas harus lebih dari 0")
	}

	if f.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}

	// 3. Panggil repository dengan userID untuk audit updated_by
	return Update(db, id, f, userID)
}

// ==========================
// NONAKTIFKAN FASILITAS (LOGIKA)
// ==========================
func DeactivateFacility(db *sql.DB, id string, userID string) error {
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	// Panggil repository dengan userID untuk audit deleted_by
	return SoftDelete(db, id, userID)
}
