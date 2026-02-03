package auth

import (
	"campus-reservation-backend/internal/whatsapp"
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ==========================
// REQUEST OBJECTS
// ==========================

type RequestOTPRequest struct {
	Phone string `json:"phone"`
	Name  string `json:"name"` // Optional, hanya wajib saat Register pertama kali
}

type VerifyOTPRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// ==========================
// SERVICE LOGIC
// ==========================

// 1. Request OTP (Digunakan untuk Login maupun Register)
func RequestOTP(db *sql.DB, req RequestOTPRequest, flowType string) error {
	// Format nomor HP standar (untuk simpan di DB bersih tanpa @s.whatsapp.net)
	cleanPhone := cleanPhoneNumber(req.Phone)
	if cleanPhone == "" {
		return errors.New("nomor telepon tidak valid")
	}

	// Cek Logika berdasarkan Flow
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)", cleanPhone).Scan(&exists)
	if err != nil {
		return err
	}

	if flowType == "login" && !exists {
		return errors.New("nomor HP belum terdaftar, silahkan register")
	}
	if flowType == "register" && exists {
		return errors.New("nomor HP sudah terdaftar, silahkan login")
	}

	// Generate 6 digit Code
	otpCode := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Hapus kode lama jika ada untuk nomor ini agar tidak nyampah
	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	// Simpan Kode ke DB (Expired 5 menit)
	_, err = db.Exec(`
		INSERT INTO verification_codes (phone_number, code, type, expiration_time)
		VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
	`, cleanPhone, otpCode, flowType)

	if err != nil {
		return errors.New("gagal menyimpan kode OTP")
	}

	// Kirim WA
	go func() {
		_ = whatsapp.SendOTP(cleanPhone, otpCode)
	}()

	return nil
}

// 2. Verify Register OTP
func VerifyRegisterOTP(db *sql.DB, req VerifyOTPRequest, name string, password string) (LoginResponse, error) {
	cleanPhone := cleanPhoneNumber(req.Phone)

	// 1. Validasi Kode OTP
	if err := validateOTP(db, cleanPhone, req.Code, "register"); err != nil {
		return LoginResponse{}, err
	}

	// 2. Hash Password (BARU)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return LoginResponse{}, errors.New("gagal mengenkripsi password")
	}

	// 3. Buat User Baru dengan Password
	var userID string
	dummyEmail := cleanPhone + "@phone.users" // Tetap pakai dummy email atau minta email user sekalian (opsional)

	// Query INSERT diupdate untuk menyertakan password_hash
	err = db.QueryRow(`
		INSERT INTO users (name, email, phone, password_hash, role, is_phone_verified)
		VALUES ($1, $2, $3, $4, 'user', true)
		RETURNING id
	`, name, dummyEmail, cleanPhone, string(hashedPassword)).Scan(&userID)

	if err != nil {
		return LoginResponse{}, errors.New("gagal membuat user baru: " + err.Error())
	}

	// 4. Buat Profile Kosong
	_, _ = db.Exec(`INSERT INTO profiles (user_id, phone_number) VALUES ($1, $2)`, userID, cleanPhone)

	// 5. Hapus OTP terpakai
	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	// 6. Generate Token
	return generateJWT(userID, "user")
}

// 3. Verify Login OTP
func VerifyLoginOTP(db *sql.DB, req VerifyOTPRequest) (LoginResponse, error) {
	cleanPhone := cleanPhoneNumber(req.Phone)

	// Validasi Kode
	if err := validateOTP(db, cleanPhone, req.Code, "login"); err != nil {
		return LoginResponse{}, err
	}

	// Ambil Data User
	var userID, role string
	err := db.QueryRow("SELECT id, role FROM users WHERE phone = $1", cleanPhone).Scan(&userID, &role)
	if err != nil {
		return LoginResponse{}, errors.New("user tidak ditemukan")
	}

	// Hapus OTP terpakai
	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	// Generate Token
	return generateJWT(userID, role)
}

// ==========================
// HELPER FUNCTIONS
// ==========================

func validateOTP(db *sql.DB, phone, code, typeFlow string) error {
	var expirationTime time.Time
	err := db.QueryRow(`
		SELECT expiration_time 
		FROM verification_codes 
		WHERE phone_number = $1 AND code = $2 AND type = $3
	`, phone, code, typeFlow).Scan(&expirationTime)

	if err == sql.ErrNoRows {
		return errors.New("kode OTP salah atau tidak ditemukan")
	} else if err != nil {
		return err
	}

	if time.Now().After(expirationTime) {
		return errors.New("kode OTP sudah kadaluarsa")
	}

	return nil
}

func generateJWT(userID, role string) (LoginResponse, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return LoginResponse{}, errors.New("gagal membuat token")
	}

	return LoginResponse{Token: signedToken}, nil
}

func cleanPhoneNumber(phone string) string {
	// Hapus spasi atau dash
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")

	// Normalisasi 628 ke 08 agar seragam di database (opsional, tergantung preferensi DB)
	// Disini saya standarkan ke format "08xxx" untuk database internal,
	// tapi saat kirim WA di client.go dikonversi ke 628
	if strings.HasPrefix(phone, "62") {
		phone = "0" + phone[2:]
	}
	return phone
}
