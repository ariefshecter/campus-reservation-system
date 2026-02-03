package auth

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// POST /auth/login/request-otp
func RequestLoginOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RequestOTPRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if err := RequestOTP(db, req, "login"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Kode OTP telah dikirim ke WhatsApp"})
	}
}

// POST /auth/login/verify-otp
func VerifyLoginOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req VerifyOTPRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		res, err := VerifyLoginOTP(db, req)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(res)
	}
}

// POST /auth/register/request-otp
func RequestRegisterOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RequestOTPRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Untuk register, nama wajib diisi di awal (atau bisa di step verify, tergantung flow UI)
		// Disini kita validasi phone saja dulu

		if err := RequestOTP(db, req, "register"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Kode OTP registrasi telah dikirim ke WhatsApp"})
	}
}

// POST /auth/register/verify-otp
func VerifyRegisterOTPHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// [UPDATE] Tambah field Password
		type VerifyRegisterReq struct {
			Phone    string `json:"phone"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			Password string `json:"password"` // <--- Field Baru
		}
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

		// Panggil Service dengan parameter password
		serviceReq := VerifyOTPRequest{Phone: req.Phone, Code: req.Code}
		// Perhatikan kita kirim req.Password ke service
		res, err := VerifyRegisterOTP(db, serviceReq, req.Name, req.Password)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(res)
	}
}
