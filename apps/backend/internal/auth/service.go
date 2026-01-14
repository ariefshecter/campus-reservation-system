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
	_, err = db.Exec(`
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
	`, req.Name, req.Email, string(hashedPassword))

	if err != nil {
		// biasanya karena email duplicate (UNIQUE)
		return errors.New("email sudah terdaftar")
	}

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
