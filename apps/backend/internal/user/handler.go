package user

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// LIST USERS HANDLER
// ==========================
func ListHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		users, err := GetAllUsers(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data user"})
		}
		return c.JSON(users)
	}
}

// ==========================
// UPDATE ROLE HANDLER (BARU)
// ==========================
func UpdateRoleHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// Ambil data dari body JSON: { "role": "admin" }
		var req struct {
			Role string `json:"role"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Format data salah"})
		}

		// Validasi sederhana: Role hanya boleh 'admin' atau 'user'
		if req.Role != "admin" && req.Role != "user" {
			return c.Status(400).JSON(fiber.Map{"error": "Role tidak valid (hanya 'admin' atau 'user')"})
		}

		// Panggil Repository
		if err := UpdateUserRole(db, id, req.Role); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal update role"})
		}

		return c.JSON(fiber.Map{"message": "Role user berhasil diubah menjadi " + req.Role})
	}
}

// ==========================
// DELETE USER HANDLER (BARU)
// ==========================
func DeleteUserHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// Opsional: Cegah admin menghapus dirinya sendiri (butuh logic tambahan cek token ID)
		// Tapi untuk sekarang kita buat simpel dulu.

		if err := DeleteUser(db, id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus user"})
		}

		return c.JSON(fiber.Map{"message": "User berhasil dihapus"})
	}
}
