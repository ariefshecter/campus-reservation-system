package user

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// ==========================
// REQUEST DTO
// ==========================
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

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
// UPDATE ROLE HANDLER
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
// DELETE USER HANDLER
// ==========================
func DeleteUserHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// Opsional: Cegah admin menghapus dirinya sendiri (butuh logic tambahan cek token ID)

		if err := DeleteUser(db, id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus user"})
		}

		return c.JSON(fiber.Map{"message": "User berhasil dihapus"})
	}
}

// ==========================
// CHANGE PASSWORD HANDLER (BARU)
// ==========================
func ChangePasswordHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		var req ChangePasswordRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Format request tidak valid"})
		}

		if len(req.NewPassword) < 6 {
			return c.Status(400).JSON(fiber.Map{"error": "Password baru minimal 6 karakter"})
		}

		// 1. Ambil data user (termasuk password hash lama) dari DB
		// Pastikan repository.go memiliki fungsi GetUserByID
		user, err := GetUserByID(db, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		// 2. Bandingkan Password Lama vs Hash di DB
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Password lama salah"})
		}

		// 3. Hash Password Baru
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengenkripsi password baru"})
		}

		// 4. Update Password di DB
		// Pastikan repository.go memiliki fungsi UpdatePassword
		if err := UpdatePassword(db, userID, string(hashedPassword)); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan password baru"})
		}

		return c.JSON(fiber.Map{"message": "Password berhasil diubah"})
	}
}
