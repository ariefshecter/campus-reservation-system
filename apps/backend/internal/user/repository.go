package user

import "database/sql"

// Struct dipindah ke sini agar bisa dipakai oleh Repo dan Handler
type UserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// ==========================
// REPOSITORY (Akses Database)
// ==========================
func GetAllUsers(db *sql.DB) ([]UserResponse, error) {
	rows, err := db.Query(`
		SELECT id, name, email, role 
		FROM users 
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []UserResponse
	for rows.Next() {
		var u UserResponse
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}
