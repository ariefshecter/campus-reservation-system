package facility

import (
	"database/sql"
)

// ==========================
// MODEL FACILITY
// ==========================
type Facility struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Capacity int     `json:"capacity"`
	Price    float64 `json:"price"`
	PhotoURL string  `json:"photo_url"`
	IsActive bool    `json:"is_active"`
}

// ==========================
// INSERT FASILITAS (Audit: created_by)
// ==========================
func Insert(db *sql.DB, f Facility, userID string) error {
	_, err := db.Exec(`
		INSERT INTO facilities (name, capacity, price, photo_url, created_by)
		VALUES ($1, $2, $3, $4, $5)
	`,
		f.Name,
		f.Capacity,
		f.Price,
		f.PhotoURL,
		userID, // Mengisi kolom created_by
	)

	return err
}

// ==========================
// GET SEMUA FASILITAS AKTIF
// ==========================
func FindAllActive(db *sql.DB) ([]Facility, error) {
	// Filter: is_active = true DAN belum dihapus (deleted_at IS NULL)
	rows, err := db.Query(`
		SELECT id, name, capacity, price, photo_url, is_active
		FROM facilities
		WHERE is_active = true 
		AND deleted_at IS NULL
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var facilities []Facility

	for rows.Next() {
		var f Facility
		err := rows.Scan(
			&f.ID,
			&f.Name,
			&f.Capacity,
			&f.Price,
			&f.PhotoURL,
			&f.IsActive,
		)
		if err != nil {
			return nil, err
		}

		facilities = append(facilities, f)
	}

	return facilities, nil
}

// ==========================
// UPDATE FASILITAS (Audit: updated_by)
// ==========================
func Update(db *sql.DB, id string, f Facility, userID string) error {
	// Update hanya jika data belum dihapus (deleted_at IS NULL)
	_, err := db.Exec(`
		UPDATE facilities
		SET name = $1,
			capacity = $2,
			price = $3,
			photo_url = $4,
			updated_at = now(),
			updated_by = $5
		WHERE id = $6 AND deleted_at IS NULL
	`,
		f.Name,
		f.Capacity,
		f.Price,
		f.PhotoURL,
		userID, // Mengisi kolom updated_by
		id,
	)

	return err
}

// ==========================
// SOFT DELETE FASILITAS (Audit: deleted_by)
// ==========================
// Menggantikan fungsi Deactivate sebelumnya
func SoftDelete(db *sql.DB, id string, userID string) error {
	// Tidak melakukan DELETE fisik, tapi update timestamp dan status
	_, err := db.Exec(`
		UPDATE facilities
		SET is_active = false,
			deleted_at = now(),
			deleted_by = $1
		WHERE id = $2 AND deleted_at IS NULL
	`, userID, id) // Mengisi kolom deleted_by

	return err
}
