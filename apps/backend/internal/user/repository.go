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
	// [FIX] Ditambahkan WHERE u.deleted_at IS NULL
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
		WHERE u.deleted_at IS NULL
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
		WHERE id = $2 AND deleted_at IS NULL
	`, newRole, userID)
	return err
}

// ==========================
// DELETE USER (SOFT DELETE + RENAME EMAIL)
// ==========================
// ==========================
// DELETE USER (SOFT DELETE + RENAME EMAIL & PHONE)
// ==========================
func DeleteUser(tx *sql.Tx, id string, adminID string) error {
	// 1. Soft Delete User & Rename Email, Name, DAN Phone agar bisa daftar lagi
	// [FIX] Tambahkan update pada kolom 'phone' dengan pengecekan NULL
	_, err := tx.Exec(`
		UPDATE users 
		SET deleted_at = NOW(), 
			deleted_by = $2,
			email = CONCAT(email, '.deleted_', EXTRACT(EPOCH FROM NOW())::bigint),
			name = CONCAT(name, ' (Deleted ', EXTRACT(EPOCH FROM NOW())::bigint, ')'),
			phone = CASE 
				WHEN phone IS NOT NULL THEN CONCAT(phone, '.deleted_', EXTRACT(EPOCH FROM NOW())::bigint) 
				ELSE NULL 
			END
		WHERE id = $1
	`, id, adminID)
	if err != nil {
		return err
	}

	// 2. Hapus Nomor HP di Profile agar bisa dipakai lagi
	_, err = tx.Exec(`
		UPDATE profiles 
		SET phone_number = NULL, 
			updated_at = NOW()
		WHERE user_id = $1
	`, id)

	return err
}

// ==========================
// GET USER BY ID (FIXED: WITH PROFILE)
// ==========================
func GetUserByID(db *sql.DB, id string) (*User, error) {
	var u User

	// Query detail user DENGAN LEFT JOIN ke profiles agar data biodata terbaca
	// [FIX] Ditambahkan filter deleted_at IS NULL
	query := `
		SELECT 
			u.id, u.name, u.email, u.password_hash, u.role, u.created_at,
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
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`

	err := db.QueryRow(query, id).Scan(
		&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt,
		&u.Profile.FullName,
		&u.Profile.PhoneNumber,
		&u.Profile.Address,
		&u.Profile.AvatarURL,
		&u.Profile.Gender,
		&u.Profile.IdentityNumber,
		&u.Profile.Department,
		&u.Profile.Position,
	)

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
		WHERE id = $2 AND deleted_at IS NULL
	`, newPasswordHash, userID)
	return err
}

type UserResponse = User

// Wrapper
func FindByID(db *sql.DB, id string) (*User, error) {
	return GetUserByID(db, id)
}

// ========================================================
// [BARU] STATISTIK KEHADIRAN USER
// ========================================================

type AttendanceStats struct {
	OnTime int `json:"on_time"`
	Late   int `json:"late"`
	NoShow int `json:"no_show"`
	Total  int `json:"total"`
}

func GetUserAttendanceStats(db *sql.DB, userID string) (AttendanceStats, error) {
	var stats AttendanceStats

	// Query menghitung jumlah berdasarkan attendance_status
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN attendance_status = 'on_time' THEN 1 ELSE 0 END), 0) as on_time,
			COALESCE(SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END), 0) as late,
			COALESCE(SUM(CASE WHEN attendance_status = 'no_show' THEN 1 ELSE 0 END), 0) as no_show
		FROM bookings
		WHERE user_id = $1 AND deleted_at IS NULL AND status IN ('completed', 'approved')
	`

	err := db.QueryRow(query, userID).Scan(&stats.OnTime, &stats.Late, &stats.NoShow)
	if err != nil {
		return stats, err
	}

	stats.Total = stats.OnTime + stats.Late + stats.NoShow
	return stats, nil
}

// ==========================
// UPDATE EMAIL
// ==========================
func UpdateEmail(db *sql.DB, userID string, newEmail string) error {
	_, err := db.Exec(`
		UPDATE users 
		SET email = $1, updated_at = NOW() 
		WHERE id = $2 AND deleted_at IS NULL
	`, newEmail, userID)
	return err
}

// ==========================
// CHECK EMAIL AVAILABILITY (BARU)
// ==========================
// Mengecek apakah email sudah dipakai user LAIN (bukan user yang sedang login)
func IsEmailTaken(db *sql.DB, email string, excludeUserID string) (bool, error) {
	var exists bool
	// [FIX] Cek juga deleted_at IS NULL agar email lama yang sudah dihapus tidak terhitung (redundant but safe)
	query := "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id <> $2 AND deleted_at IS NULL)"
	err := db.QueryRow(query, email, excludeUserID).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}
