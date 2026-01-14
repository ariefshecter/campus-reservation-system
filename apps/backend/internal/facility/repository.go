package facility

import (
	"database/sql"
	"errors"
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
// INSERT FASILITAS
// ==========================
func Insert(db *sql.DB, f Facility) error {
	_, err := db.Exec(`
		INSERT INTO facilities (name, capacity, price, photo_url)
		VALUES ($1, $2, $3, $4)
	`,
		f.Name,
		f.Capacity,
		f.Price,
		f.PhotoURL,
	)

	return err
}

// ==========================
// GET SEMUA FASILITAS AKTIF
// ==========================
func FindAllActive(db *sql.DB) ([]Facility, error) {
	rows, err := db.Query(`
		SELECT id, name, capacity, price, photo_url, is_active
		FROM facilities
		WHERE is_active = true
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
// UPDATE FASILITAS
// ==========================
func Update(db *sql.DB, id string, f Facility) error {
	_, err := db.Exec(`
		UPDATE facilities
		SET name = $1,
		    capacity = $2,
		    price = $3,
		    photo_url = $4,
		    updated_at = now()
		WHERE id = $5
	`,
		f.Name,
		f.Capacity,
		f.Price,
		f.PhotoURL,
		id,
	)

	return err
}

// ==========================
// NONAKTIFKAN FASILITAS (SOFT DELETE)
// ==========================
func Deactivate(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE facilities
		SET is_active = false,
		    updated_at = now()
		WHERE id = $1
	`, id)

	return err
}

// ==========================
// UPDATE FASILITAS (LOGIKA)
// ==========================
func UpdateFacility(db *sql.DB, id string, f Facility) error {
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	if f.Name == "" {
		return errors.New("nama fasilitas wajib diisi")
	}

	if f.Capacity <= 0 {
		return errors.New("kapasitas harus lebih dari 0")
	}

	if f.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}

	return Update(db, id, f)
}

// ==========================
// NONAKTIFKAN FASILITAS
// ==========================
func DeactivateFacility(db *sql.DB, id string) error {
	if id == "" {
		return errors.New("id fasilitas tidak valid")
	}

	return Deactivate(db, id)
}
