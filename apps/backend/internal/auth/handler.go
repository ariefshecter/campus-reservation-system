package auth

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// ==========================
// REGISTER HANDLER
// ==========================
func RegisterHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req RegisterRequest

		// 1. Parse body JSON
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		// 2. Panggil service register
		if err := Register(db, req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// 3. Response sukses
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "registrasi berhasil",
		})
	}
}

// ==========================
// LOGIN HANDLER
// ==========================
func LoginHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest

		// 1. Parse body JSON
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		// 2. Panggil service login
		res, err := Login(db, req)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// 3. Response token
		return c.Status(fiber.StatusOK).JSON(res)
	}
}

// ==========================
// ME HANDLER (GET PROFILE)
// ==========================
func MeHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Ambil User dari Token JWT (disimpan oleh middleware di c.Locals)
		userToken := c.Locals("user").(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)

		// Ambil user_id dari claims
		userID := claims["user_id"].(string)

		// 2. Panggil Service GetMe
		userResponse, err := GetMe(db, userID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "user tidak ditemukan",
			})
		}

		// 3. Response data user lengkap dengan profile
		return c.Status(fiber.StatusOK).JSON(userResponse)
	}
}
