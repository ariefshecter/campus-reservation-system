package facility

import (
	"database/sql"

	"github.com/lib/pq" // WAJIB: Library untuk handle Array PostgreSQL
)

// ==========================
// MODEL FACILITY
// ==========================
type Facility struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Location      string   `json:"location"`
	Capacity      int      `json:"capacity"`
	Price         float64  `json:"price"`
	PhotoURL      []string `json:"photo_url"` // UBAH: string -> []string (Array)
	IsActive      bool     `json:"is_active"`
	CreatedByName string   `json:"created_by_name"`
	UpdatedByName string   `json:"updated_by_name"`
}

// ==========================
// INSERT
// ==========================
func Insert(db *sql.DB, f Facility, userID string) error {
	// Gunakan pq.Array() untuk menyimpan slice Go ke kolom text[] PostgreSQL
	_, err := db.Exec(`
		INSERT INTO facilities (name, description, location, capacity, price, photo_url, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, f.Name, f.Description, f.Location, f.Capacity, f.Price, pq.Array(f.PhotoURL), userID)
	return err
}

// ==========================
// GET ALL (JOIN USERS)
// ==========================
func FindAll(db *sql.DB) ([]Facility, error) {
	// Tambahkan COALESCE(..., '{}') agar jika NULL, terbaca sebagai array kosong
	rows, err := db.Query(`
		SELECT 
			f.id, f.name, COALESCE(f.description, ''), COALESCE(f.location, ''), 
			f.capacity, COALESCE(f.price, 0), 
			COALESCE(f.photo_url, '{}'), 
			f.is_active,
			COALESCE(u_cre.name, '-'), 
			COALESCE(u_upd.name, '')
		FROM facilities f
		LEFT JOIN users u_cre ON f.created_by = u_cre.id
		LEFT JOIN users u_upd ON f.updated_by = u_upd.id
		WHERE f.deleted_at IS NULL
		ORDER BY f.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var facilities []Facility
	for rows.Next() {
		var f Facility
		// Gunakan pq.Array(&f.PhotoURL) untuk scan array DB ke slice Go
		if err := rows.Scan(
			&f.ID, &f.Name, &f.Description, &f.Location,
			&f.Capacity, &f.Price, pq.Array(&f.PhotoURL), &f.IsActive,
			&f.CreatedByName, &f.UpdatedByName,
		); err != nil {
			return nil, err
		}
		facilities = append(facilities, f)
	}
	return facilities, nil
}

// ==========================
// GET ONE BY ID
// ==========================
func FindByID(db *sql.DB, id string) (Facility, error) {
	var f Facility
	// Query ini tidak perlu join user karena hanya untuk mengisi form edit
	err := db.QueryRow(`
		SELECT id, name, COALESCE(description, ''), COALESCE(location, ''), capacity, COALESCE(price, 0), 
		COALESCE(photo_url, '{}'), is_active
		FROM facilities WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(&f.ID, &f.Name, &f.Description, &f.Location, &f.Capacity, &f.Price, pq.Array(&f.PhotoURL), &f.IsActive)
	return f, err
}

// ==========================
// UPDATE
// ==========================
func Update(db *sql.DB, id string, f Facility, userID string) error {
	_, err := db.Exec(`
		UPDATE facilities
		SET name = $1, description = $2, location = $3, capacity = $4, price = $5, photo_url = $6, updated_at = now(), updated_by = $7
		WHERE id = $8 AND deleted_at IS NULL
	`, f.Name, f.Description, f.Location, f.Capacity, f.Price, pq.Array(f.PhotoURL), userID, id)
	return err
}

// ==========================
// TOGGLE ACTIVE
// ==========================
func ToggleActive(db *sql.DB, id string, status bool, userID string) error {
	_, err := db.Exec(`
		UPDATE facilities 
		SET is_active = $1, updated_at = now(), updated_by = $2
		WHERE id = $3 AND deleted_at IS NULL
	`, status, userID, id)
	return err
}

// ==========================
// DELETE PERMANEN
// ==========================
func HardDelete(db *sql.DB, id string) error {
	_, err := db.Exec("DELETE FROM facilities WHERE id = $1", id)
	return err
}
