package auth

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================================
// DEFINISI STRUCT UNTUK SWAGGER & HANDLER
// ==========================================

// RequestOTPReq digunakan untuk payload request OTP (Login & Register)
type RequestOTPReq struct {
	Phone string `json:"phone" example:"08123456789"`
}

// VerifyLoginReq digunakan untuk verifikasi Login
type VerifyLoginReq struct {
	Phone string `json:"phone" example:"08123456789"`
	Code  string `json:"code" example:"123456"`
}

// VerifyRegisterReq digunakan untuk verifikasi Register (Lengkap dengan Password)
type VerifyRegisterReq struct {
	Phone    string `json:"phone" example:"08123456789"`
	Code     string `json:"code" example:"123456"`
	Name     string `json:"name" example:"Budi Santoso"`
	Password string `json:"password" example:"rahasia123"`
}

// ==========================================
// HANDLER FUNCTIONS
// ==========================================

// RequestLoginOTPHandler meminta kode OTP untuk Login
// @Summary      Request OTP Login (WA)
// @Description  Mengirimkan kode OTP ke WhatsApp user yang SUDAH terdaftar.
// @Tags         Auth WhatsApp
// @Accept       json
// @Produce      json
// @Param        request body RequestOTPReq true "Nomor WhatsApp"
// @Success      200  {object} map[string]string "OTP Terkirim"
// @Failure      400  {object} map[string]string "Error Validasi"
// @Router       /auth/login/request-otp [post]
func RequestLoginOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RequestOTPReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Parameter ke-3 "login" menandakan ini untuk flow login
		// Asumsi: Fungsi RequestOTP ada di service_otp.go dan menerima struct yang sesuai
		// Kita mapping manual ke struct yang diharapkan service jika beda,
		// tapi disini kita asumsikan RequestOTP menerima interface/struct serupa.
		// Jika RequestOTP butuh struct spesifik 'RequestOTPRequest', kita mapping:
		serviceReq := RequestOTPRequest{Phone: req.Phone}

		if err := RequestOTP(db, serviceReq, "login"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Kode OTP telah dikirim ke WhatsApp"})
	}
}

// VerifyLoginOTPHandler memverifikasi OTP Login
// @Summary      Verifikasi OTP Login (WA)
// @Description  Tukar kode OTP dengan Token JWT.
// @Tags         Auth WhatsApp
// @Accept       json
// @Produce      json
// @Param        request body VerifyLoginReq true "Data Verifikasi"
// @Success      200  {object} map[string]string "Token JWT"
// @Failure      400  {object} map[string]string "Invalid Request"
// @Failure      401  {object} map[string]string "OTP Salah/Expired"
// @Router       /auth/login/verify-otp [post]
func VerifyLoginOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req VerifyLoginReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Mapping ke struct service
		serviceReq := VerifyOTPRequest{Phone: req.Phone, Code: req.Code}

		res, err := VerifyLoginOTP(db, serviceReq)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(res)
	}
}

// RequestRegisterOTPHandler meminta OTP untuk Register
// @Summary      Request OTP Register (WA)
// @Description  Mengirimkan kode OTP ke nomor baru untuk pendaftaran.
// @Tags         Auth WhatsApp
// @Accept       json
// @Produce      json
// @Param        request body RequestOTPReq true "Nomor WhatsApp"
// @Success      200  {object} map[string]string "OTP Terkirim"
// @Failure      400  {object} map[string]string "Error (Misal: Nomor sudah ada)"
// @Router       /auth/register/request-otp [post]
func RequestRegisterOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RequestOTPReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Mapping ke struct service
		serviceReq := RequestOTPRequest{Phone: req.Phone}

		if err := RequestOTP(db, serviceReq, "register"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Kode OTP registrasi telah dikirim ke WhatsApp"})
	}
}

// VerifyRegisterOTPHandler memverifikasi OTP & Buat User
// @Summary      Verifikasi OTP Register (WA)
// @Description  Verifikasi OTP sekaligus membuat user baru dengan password.
// @Tags         Auth WhatsApp
// @Accept       json
// @Produce      json
// @Param        request body VerifyRegisterReq true "Data Register Lengkap"
// @Success      201  {object} map[string]string "User Created & Token"
// @Failure      400  {object} map[string]string "Validasi Gagal"
// @Router       /auth/register/verify-otp [post]
func VerifyRegisterOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req VerifyRegisterReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Validasi Input
		if req.Name == "" || req.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Nama dan Password wajib diisi"})
		}
		if len(req.Password) < 6 {
			return c.Status(400).JSON(fiber.Map{"error": "Password minimal 6 karakter"})
		}

		// Panggil Service
		serviceReq := VerifyOTPRequest{Phone: req.Phone, Code: req.Code}

		res, err := VerifyRegisterOTP(db, serviceReq, req.Name, req.Password)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(res)
	}
}
