package auth

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// ==========================
// REGISTER HANDLER
// ==========================

// @Summary      Register User Baru
// @Description  Mendaftarkan user baru dengan Email & Password.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request body RegisterRequest true "Payload Register"
// @Success      201  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Router       /auth/register [post]
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

// @Summary      Login User
// @Description  Masuk ke sistem untuk mendapatkan Token JWT.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Payload Login"
// @Success      200  {object}  LoginResponse
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Router       /auth/login [post]
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

// @Summary      Get My Profile
// @Description  Menampilkan detail profile user yang sedang login (Cek Token).
// @Tags         Auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  UserResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /me [get]
func MeHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// PERBAIKAN LOGIC UNTUK MIDDLEWARE CUSTOM
		// Jika menggunakan middleware.go kamu yg sebelumnya, data tersimpan di "user_id", bukan "user"

		// Cek apakah ada data user_id dari middleware
		userIDVal := c.Locals("user_id")
		if userIDVal == nil {
			// Fallback: Coba ambil dari standard JWT token jika logic middleware berbeda
			userToken, ok := c.Locals("user").(*jwt.Token)
			if ok {
				claims := userToken.Claims.(jwt.MapClaims)
				userIDVal = claims["user_id"]
			} else {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Unauthorized: Token invalid",
				})
			}
		}

		userID := userIDVal.(string)

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
