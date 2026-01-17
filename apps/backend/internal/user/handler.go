package user

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// HANDLER (HTTP Endpoint)
// ==========================
func ListHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Panggil fungsi dari repository.go
		users, err := GetAllUsers(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data user"})
		}
		return c.JSON(users)
	}
}
