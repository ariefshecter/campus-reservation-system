package auth

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// ==========================
// JWT AUTH MIDDLEWARE
// ==========================
// Digunakan untuk:
// - memastikan user sudah login
// - mengambil user_id & role dari token
func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")

		// 1. Cek header Authorization
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authorization header tidak ada",
			})
		}

		// 2. Format harus: Bearer <token>
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "format authorization salah",
			})
		}

		tokenString := parts[1]

		// 3. Parse JWT
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			// Pastikan algoritma sesuai
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "token tidak valid atau kadaluarsa",
			})
		}

		// 4. Ambil claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "gagal membaca token",
			})
		}

		// 5. Simpan data user ke context
		c.Locals("user_id", claims["user_id"])
		c.Locals("role", claims["role"])

		return c.Next()
	}
}

// ==========================
// ROLE-BASED ACCESS CONTROL
// ==========================
// Contoh: AdminOnly(), UserOnly()
func RequireRole(requiredRole string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("role")

		if role == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "role tidak ditemukan",
			})
		}

		if role != requiredRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "akses ditolak",
			})
		}

		return c.Next()
	}
}
