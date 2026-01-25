package user

import (
	"database/sql"
	"time"
)

// ==========================
// ENTITY / STRUCT
// ==========================

// Struct Profile (untuk nested JSON di response User)
type Profile struct {
	FullName       string `json:"full_name"`
	PhoneNumber    string `json:"phone_number"`
	Address        string `json:"address"`
	AvatarURL      string `json:"avatar_url"`
	Gender         string `json:"gender"`
	IdentityNumber string `json:"identity_number"`
	Department     string `json:"department"`
	Position       string `json:"position"`
}

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	Profile   Profile   `json:"profile"` // Data profile terlampir
}

// ==========================
// GET ALL USERS
// ==========================
func GetAllUsers(db *sql.DB) ([]User, error) {
	// Query list user dengan LEFT JOIN ke profiles untuk mengambil data detail
	// Menggunakan COALESCE agar jika data profile NULL (belum diisi), diganti string kosong ""
	query := `
		SELECT 
			u.id, u.name, u.email, u.role, u.created_at,
			COALESCE(p.full_name, ''),
			COALESCE(p.phone_number, ''),
			COALESCE(p.address, ''),
			COALESCE(p.avatar_url, ''),
			COALESCE(p.gender, ''),
			COALESCE(p.identity_number, ''),
			COALESCE(p.department, ''),
			COALESCE(p.position, '')
		FROM users u
		LEFT JOIN profiles p ON u.id = p.user_id
		ORDER BY u.role ASC, u.created_at DESC 
	`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		// Scan data user beserta data profilnya
		if err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt,
			&u.Profile.FullName,
			&u.Profile.PhoneNumber,
			&u.Profile.Address,
			&u.Profile.AvatarURL,
			&u.Profile.Gender,
			&u.Profile.IdentityNumber,
			&u.Profile.Department,
			&u.Profile.Position,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

// ==========================
// UPDATE ROLE
// ==========================
func UpdateUserRole(db *sql.DB, userID string, newRole string) error {
	_, err := db.Exec(`
		UPDATE users 
		SET role = $1, updated_at = NOW()
		WHERE id = $2
	`, newRole, userID)
	return err
}

// ==========================
// DELETE USER
// ==========================
func DeleteUser(db *sql.DB, id string) error {
	_, err := db.Exec("DELETE FROM users WHERE id = $1", id)
	return err
}

// ==========================
// GET USER BY ID (FIXED)
// ==========================
func GetUserByID(db *sql.DB, id string) (*User, error) {
	var u User
	// 🔥 PERBAIKAN DISINI: Ganti 'password' jadi 'password_hash'
	err := db.QueryRow(`
		SELECT id, name, email, password_hash, role, created_at 
		FROM users 
		WHERE id = $1
	`, id).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ==========================
// UPDATE PASSWORD
// ==========================
func UpdatePassword(db *sql.DB, userID string, newPasswordHash string) error {
	_, err := db.Exec(`
		UPDATE users 
		SET password_hash = $1, updated_at = NOW() 
		WHERE id = $2
	`, newPasswordHash, userID)
	return err
}

type UserResponse = User

// Wrapper
func FindByID(db *sql.DB, id string) (*User, error) {
	return GetUserByID(db, id)
}
