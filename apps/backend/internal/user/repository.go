package user

import "database/sql"

// Struct User
type UserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// ==========================
// GET ALL USERS
// ==========================
func GetAllUsers(db *sql.DB) ([]UserResponse, error) {
	rows, err := db.Query(`
		SELECT id, name, email, role 
		FROM users 
		ORDER BY role ASC, created_at DESC 
	`) // Kita urutkan Role ASC agar Admin muncul paling atas
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

// ==========================
// UPDATE ROLE (BARU)
// ==========================
func UpdateUserRole(db *sql.DB, userID string, newRole string) error {
	_, err := db.Exec(`
		UPDATE users 
		SET role = $1, updated_at = now()
		WHERE id = $2
	`, newRole, userID)
	return err
}

// ==========================
// DELETE USER (BARU)
// ==========================
func DeleteUser(db *sql.DB, id string) error {
	_, err := db.Exec("DELETE FROM users WHERE id = $1", id)
	return err
}

// ==========================
// FIND BY ID (BARU)
// ==========================
func FindByID(db *sql.DB, id string) (UserResponse, error) {
	var u UserResponse
	err := db.QueryRow("SELECT id, name, email, role FROM users WHERE id = $1", id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role)
	return u, err
}
