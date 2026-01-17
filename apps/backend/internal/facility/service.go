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
	// TAMBAHAN VALIDASI
	if f.Description == "" {
		return errors.New("deskripsi fasilitas wajib diisi")
	}
	if f.Location == "" {
		return errors.New("lokasi fasilitas wajib diisi")
	}
	if f.Capacity <= 0 {
		return errors.New("kapasitas harus lebih dari 0")
	}
	// Harga boleh 0 (gratis), tapi tidak boleh negatif
	if f.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}

	// 2. Panggil repository
	return Insert(db, f, userID)
}

// ==========================
// GET LIST FASILITAS
// ==========================
func GetAllFacilities(db *sql.DB) ([]Facility, error) {
	// PERBAIKAN: Menggunakan FindAll (bukan FindAllActive lagi)
	return FindAll(db)
}

// ==========================
// UPDATE FASILITAS (LOGIKA)
// ==========================
func UpdateFacility(db *sql.DB, id string, f Facility, userID string) error {
	// 1. Validasi ID
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	// 2. Validasi Data
	if f.Name == "" {
		return errors.New("nama fasilitas wajib diisi")
	}
	if f.Description == "" {
		return errors.New("deskripsi fasilitas wajib diisi")
	}
	if f.Location == "" {
		return errors.New("lokasi fasilitas wajib diisi")
	}
	if f.Capacity <= 0 {
		return errors.New("kapasitas harus lebih dari 0")
	}
	if f.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}

	// 3. Panggil repository
	return Update(db, id, f, userID)
}

// ==========================
// DELETE FASILITAS (PERMANEN)
// ==========================
// Menggantikan fungsi DeactivateFacility yang lama
func DeleteFacility(db *sql.DB, id string) error {
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	// PERBAIKAN: Menggunakan HardDelete (bukan SoftDelete)
	return HardDelete(db, id)
}

// ==========================
// TOGGLE STATUS (AKTIF/NONAKTIF)
// ==========================
// Fungsi Baru untuk switch status
func ToggleFacilityStatus(db *sql.DB, id string, isActive bool, userID string) error {
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	return ToggleActive(db, id, isActive, userID)
}
