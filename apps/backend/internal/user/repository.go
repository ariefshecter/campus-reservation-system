package user

import (
	"database/sql"
	"time"
)

// ==========================
// ENTITY / STRUCT
// ==========================
type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// ==========================
// GET ALL USERS
// ==========================
func GetAllUsers(db *sql.DB) ([]User, error) {
	// Query list user (tanpa password)
	rows, err := db.Query(`
		SELECT id, name, email, role, created_at 
		FROM users 
		ORDER BY role ASC, created_at DESC 
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt); err != nil {
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
