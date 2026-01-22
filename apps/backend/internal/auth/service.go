package auth

import (
	"database/sql"
	"errors"
	"os"
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

	// 2. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return errors.New("gagal mengenkripsi password")
	}

	// 3. Simpan ke database
	// UPDATE: Kita gunakan QueryRow ... RETURNING id agar kita dapat ID user yang baru dibuat
	var userID string
	err = db.QueryRow(`
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.Name, req.Email, string(hashedPassword)).Scan(&userID)

	if err != nil {
		// biasanya karena email duplicate (UNIQUE)
		return errors.New("email sudah terdaftar")
	}

	// UPDATE BARU: Buat entry kosong di tabel profiles untuk user ini
	// Ini menjamin user punya profil (meski masih kosong)
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
// ===== GET ME (BARU) =====
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

	// Gunakan sql.NullString untuk menangani jika avatar_url di database NULL
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

	// Jika avatar ada di DB, masukkan ke struct. Jika NULL, biarkan string kosong ""
	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}

	return user, nil
}
