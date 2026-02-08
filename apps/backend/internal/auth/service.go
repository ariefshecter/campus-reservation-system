package auth

import (
	"database/sql"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

//
// ===== REGISTER =====
//

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(db *sql.DB, req RegisterRequest) error {

	if req.Name == "" || req.Email == "" || req.Password == "" {
		return errors.New("semua field wajib diisi")
	}

	if len(req.Password) < 6 {
		return errors.New("password minimal 6 karakter")
	}

	// ---------------------------------------------------------
	// 1. CEK DUPLIKASI TERLEBIH DAHULU (LOGIKA BARU)
	// ---------------------------------------------------------
	// Kita cari apakah ada user dengan nama ATAU email yang sama
	rows, err := db.Query("SELECT name, email FROM users WHERE name = $1 OR email = $2", req.Name, req.Email)
	if err != nil {
		return errors.New("terjadi kesalahan server saat pengecekan data")
	}
	defer rows.Close()

	var nameExists, emailExists bool

	// Loop hasilnya (bisa jadi ada 1 baris yang sama persis, atau 2 baris beda user)
	for rows.Next() {
		var dbName, dbEmail string
		if err := rows.Scan(&dbName, &dbEmail); err == nil {
			if dbName == req.Name {
				nameExists = true
			}
			if dbEmail == req.Email {
				emailExists = true
			}
		}
	}

	// Tentukan pesan error berdasarkan kondisi
	if nameExists && emailExists {
		return errors.New("username dan email sudah terdaftar")
	}
	if nameExists {
		return errors.New("username sudah terdaftar")
	}
	if emailExists {
		return errors.New("email sudah terdaftar")
	}

	// ---------------------------------------------------------
	// 2. JIKA AMAN, LANJUTKAN PROSES HASHING & INSERT
	// ---------------------------------------------------------

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return errors.New("gagal mengenkripsi password")
	}

	// Simpan ke database
	var userID string
	err = db.QueryRow(`
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.Name, req.Email, string(hashedPassword)).Scan(&userID)

	if err != nil {
		// Fallback error handling (jaga-jaga jika ada race condition)
		if strings.Contains(err.Error(), "users_name_key") {
			return errors.New("username telah digunakan")
		}
		if strings.Contains(err.Error(), "users_email_key") {
			return errors.New("email sudah terdaftar")
		}
		return errors.New("gagal mendaftar, terjadi kesalahan server")
	}

	// Buat entry kosong di tabel profiles
	_, _ = db.Exec(`INSERT INTO profiles (user_id) VALUES ($1)`, userID)

	return nil
}

//
// ===== LOGIN =====
//

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

func Login(db *sql.DB, req LoginRequest) (LoginResponse, error) {
	var (
		userID       string
		passwordHash string
		role         string
	)

	// 1. Ambil user berdasarkan email
	err := db.QueryRow(`
		SELECT id, password_hash, role
		FROM users
		WHERE email = $1
	`, req.Email).Scan(&userID, &passwordHash, &role)

	if err != nil {
		return LoginResponse{}, errors.New("email atau password salah")
	}

	// 2. Cocokkan password
	err = bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(req.Password),
	)
	if err != nil {
		return LoginResponse{}, errors.New("email atau password salah")
	}

	// 3. Buat JWT token
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return LoginResponse{}, errors.New("JWT_SECRET belum diset")
	}

	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return LoginResponse{}, errors.New("gagal membuat token")
	}

	return LoginResponse{
		Token: signedToken,
	}, nil
}

//
// ===== GET ME =====
// Fungsi untuk mengambil data user beserta foto profilnya
//

type UserResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url"`
}

func GetMe(db *sql.DB, userID string) (UserResponse, error) {
	var user UserResponse

	var avatarURL sql.NullString

	// Query LEFT JOIN users & profiles
	// Mengambil data user dan avatar_url dari profiles jika ada
	query := `
		SELECT 
			u.id, u.name, u.email, u.role,
			p.avatar_url
		FROM users u
		LEFT JOIN profiles p ON u.id = p.user_id
		WHERE u.id = $1
	`

	err := db.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&avatarURL,
	)

	if err != nil {
		return UserResponse{}, err
	}

	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}

	return user, nil
}
