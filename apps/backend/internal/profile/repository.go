package profile

import (
	"database/sql"
	"time"
)

// Struct Profile sesuai database
type Profile struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	FullName       string    `json:"full_name"`
	PhoneNumber    string    `json:"phone_number"`
	Address        string    `json:"address"`
	AvatarURL      string    `json:"avatar_url"`
	Gender         string    `json:"gender"`          // 'L' atau 'P'
	IdentityNumber string    `json:"identity_number"` // NIM / NIP / NIDN
	Department     string    `json:"department"`      // Jurusan / Unit
	Position       string    `json:"position"`        // Semester / Jabatan
	UpdatedAt      time.Time `json:"updated_at"`
}

// ==========================================
// AMBIL PROFIL (GET)
// ==========================================
func GetByUserID(db *sql.DB, userID string) (*Profile, error) {
	var p Profile
	// Kita gunakan COALESCE agar jika data masih NULL di DB, return string kosong ""
	query := `
		SELECT 
			id, user_id, 
			COALESCE(full_name, ''), 
			COALESCE(phone_number, ''), 
			COALESCE(address, ''), 
			COALESCE(avatar_url, ''), 
			COALESCE(gender, ''), 
			COALESCE(identity_number, ''), 
			COALESCE(department, ''), 
			COALESCE(position, ''),
			updated_at
		FROM profiles 
		WHERE user_id = $1
	`
	err := db.QueryRow(query, userID).Scan(
		&p.ID, &p.UserID, &p.FullName, &p.PhoneNumber, &p.Address,
		&p.AvatarURL, &p.Gender, &p.IdentityNumber, &p.Department,
		&p.Position, &p.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}
	return &p, nil
}

// ==========================================
// SIMPAN / UPDATE PROFIL (UPSERT)
// ==========================================
func Upsert(db *sql.DB, userID string, p Profile) error {
	// Fitur canggih SQL: ON CONFLICT
	// Jika data user_id sudah ada -> Lakukan UPDATE
	// Jika belum ada -> Lakukan INSERT
	query := `
		INSERT INTO profiles (
			user_id, full_name, phone_number, address, avatar_url, gender, 
			identity_number, department, position, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		ON CONFLICT (user_id) 
		DO UPDATE SET
			full_name = EXCLUDED.full_name,
			phone_number = EXCLUDED.phone_number,
			address = EXCLUDED.address,
			avatar_url = EXCLUDED.avatar_url,
			gender = EXCLUDED.gender,
			identity_number = EXCLUDED.identity_number,
			department = EXCLUDED.department,
			position = EXCLUDED.position,
			updated_at = NOW();
	`
	_, err := db.Exec(query,
		userID, p.FullName, p.PhoneNumber, p.Address, p.AvatarURL, p.Gender,
		p.IdentityNumber, p.Department, p.Position,
	)
	return err
}
