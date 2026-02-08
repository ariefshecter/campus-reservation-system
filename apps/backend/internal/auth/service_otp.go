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
	Name  string `json:"name"`
}

type VerifyOTPRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// ==========================
// SERVICE LOGIC
// ==========================

// 1. Request OTP (Digunakan untuk Login, Register, dan Ganti Nomor)
func RequestOTP(db *sql.DB, req RequestOTPRequest, flowType string) error {
	// Format nomor HP standar
	cleanPhone := cleanPhoneNumber(req.Phone)
	if cleanPhone == "" {
		return errors.New("nomor telepon tidak valid")
	}

	// -------------------------------------------------------------
	// 1. VALIDASI KE WHATSAPP GATEWAY
	// -------------------------------------------------------------
	isWARegistered, err := whatsapp.CheckUser(cleanPhone)
	if err != nil {
		return errors.New("gagal memvalidasi nomor ke server WhatsApp: " + err.Error())
	}

	if !isWARegistered {
		return errors.New("nomor ini tidak terdaftar di WhatsApp")
	}

	// -------------------------------------------------------------
	// 2. CEK DATABASE LOKAL
	// -------------------------------------------------------------
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)", cleanPhone).Scan(&exists)
	if err != nil {
		return err
	}

	// Logika berdasarkan Flow Type
	if flowType == "login" && !exists {
		return errors.New("nomor HP belum terdaftar, silahkan register")
	}
	if flowType == "register" && exists {
		return errors.New("nomor HP sudah terdaftar, silahkan login")
	}
	// [BARU] Validasi untuk Ganti Nomor
	if flowType == "change_phone" && exists {
		return errors.New("nomor HP sudah digunakan oleh pengguna lain")
	}

	// -------------------------------------------------------------
	// 3. GENERATE & SIMPAN OTP
	// -------------------------------------------------------------
	otpCode := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Hapus kode lama
	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	// Simpan Kode (Expired 5 menit)
	_, err = db.Exec(`
		INSERT INTO verification_codes (phone_number, code, type, expiration_time)
		VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
	`, cleanPhone, otpCode, flowType)

	if err != nil {
		return errors.New("gagal menyimpan kode OTP")
	}

	// Kirim WA
	go func() {
		if err := whatsapp.SendOTP(cleanPhone, otpCode); err != nil {
			fmt.Printf("Gagal mengirim OTP ke %s: %v\n", cleanPhone, err)
		}
	}()

	return nil
}

// 2. Verify Register OTP
func VerifyRegisterOTP(db *sql.DB, req VerifyOTPRequest, name string, password string) (LoginResponse, error) {
	cleanPhone := cleanPhoneNumber(req.Phone)

	if err := validateOTP(db, cleanPhone, req.Code, "register"); err != nil {
		return LoginResponse{}, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return LoginResponse{}, errors.New("gagal mengenkripsi password")
	}

	var userID string
	dummyEmail := cleanPhone + "@phone.users"

	err = db.QueryRow(`
		INSERT INTO users (name, email, phone, password_hash, role, is_phone_verified)
		VALUES ($1, $2, $3, $4, 'user', true)
		RETURNING id
	`, name, dummyEmail, cleanPhone, string(hashedPassword)).Scan(&userID)

	if err != nil {
		return LoginResponse{}, errors.New("gagal membuat user baru: " + err.Error())
	}

	_, _ = db.Exec(`INSERT INTO profiles (user_id, phone_number) VALUES ($1, $2)`, userID, cleanPhone)
	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	return generateJWT(userID, "user")
}

// 3. Verify Login OTP
func VerifyLoginOTP(db *sql.DB, req VerifyOTPRequest) (LoginResponse, error) {
	cleanPhone := cleanPhoneNumber(req.Phone)

	if err := validateOTP(db, cleanPhone, req.Code, "login"); err != nil {
		return LoginResponse{}, err
	}

	var userID, role string
	err := db.QueryRow("SELECT id, role FROM users WHERE phone = $1", cleanPhone).Scan(&userID, &role)
	if err != nil {
		return LoginResponse{}, errors.New("user tidak ditemukan")
	}

	_, _ = db.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)

	return generateJWT(userID, role)
}

// 4. [BARU] Verify Change Phone OTP
func VerifyChangePhoneOTP(db *sql.DB, userID string, req VerifyOTPRequest) error {
	cleanPhone := cleanPhoneNumber(req.Phone)

	// 1. Validasi Kode OTP
	if err := validateOTP(db, cleanPhone, req.Code, "change_phone"); err != nil {
		return err
	}

	// 2. Gunakan Transaksi Database (Agar User & Profile terupdate bersamaan)
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	// Update tabel users
	_, err = tx.Exec(`
		UPDATE users 
		SET phone = $1, is_phone_verified = true, updated_at = NOW() 
		WHERE id = $2
	`, cleanPhone, userID)
	if err != nil {
		tx.Rollback()
		return errors.New("gagal mengupdate data user")
	}

	// Update tabel profiles
	_, err = tx.Exec(`
		UPDATE profiles 
		SET phone_number = $1, updated_at = NOW() 
		WHERE user_id = $2
	`, cleanPhone, userID)
	if err != nil {
		tx.Rollback()
		return errors.New("gagal mengupdate profile")
	}

	// Hapus OTP yang sudah dipakai
	_, err = tx.Exec("DELETE FROM verification_codes WHERE phone_number = $1", cleanPhone)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
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
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")

	if strings.HasPrefix(phone, "62") {
		phone = "0" + phone[2:]
	}
	return phone
}
