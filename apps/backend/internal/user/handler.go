package user

import (
	"database/sql"

	"campus-reservation-backend/internal/booking" // [FIX] Import ini penting untuk cancel booking

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
// GET ONE USER HANDLER (DETAIL + STATS)
// ==========================
func GetOneHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// 1. Ambil Data User & Profile
		user, err := FindByID(db, id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		// 2. Ambil Statistik Kehadiran (Hitung dari booking)
		stats, err := GetUserAttendanceStats(db, id)
		if err != nil {
			// Jika gagal hitung stats, jangan error 500, cukup kirim data kosong
			stats = AttendanceStats{}
		}

		// 3. Return JSON Gabungan
		return c.JSON(fiber.Map{
			"id":         user.ID,
			"name":       user.Name,
			"email":      user.Email,
			"role":       user.Role,
			"created_at": user.CreatedAt,
			"profile":    user.Profile, // Data profile (alamat, hp, dll)
			"stats":      stats,        // Data statistik (on_time, late, no_show)
		})
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
// DELETE USER HANDLER (FIXED: Transaction & Arguments)
// ==========================
func DeleteUserHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id") // ID User yang akan dihapus

		// Ambil ID Admin yang sedang login dari JWT
		adminID, ok := c.Locals("user_id").(string)
		if !ok || adminID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		// Cegah admin menghapus dirinya sendiri
		if id == adminID {
			return c.Status(400).JSON(fiber.Map{"error": "Tidak dapat menghapus akun sendiri"})
		}

		// 1. Mulai Transaksi Database
		tx, err := db.Begin()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memulai transaksi"})
		}

		// Defer Rollback: Jika terjadi error di tengah jalan, batalkan semua perubahan
		defer tx.Rollback()

		// 2. Batalkan Booking Masa Depan User Tersebut
		//    (Agar ruangan kosong kembali dan bisa dipesan orang lain)
		if err := booking.CancelFutureBookingsTx(tx, id, adminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal membatalkan booking user"})
		}

		// 3. Soft Delete User & Rename Email
		//    (Parameter sekarang: tx, id_user, id_admin)
		if err := DeleteUser(tx, id, adminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus user"})
		}

		// 4. Commit Transaksi (Simpan Perubahan Permanen)
		if err := tx.Commit(); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan perubahan"})
		}

		return c.JSON(fiber.Map{"message": "User berhasil dihapus, email dibebaskan, dan jadwal mendatang dibatalkan"})
	}
}

// ==========================
// CHANGE PASSWORD HANDLER
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
		if err := UpdatePassword(db, userID, string(hashedPassword)); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan password baru"})
		}

		return c.JSON(fiber.Map{"message": "Password berhasil diubah"})
	}
}

// ==========================
// DTO: CHANGE EMAIL (BARU)
// ==========================
type ChangeEmailRequest struct {
	NewEmail string `json:"new_email"`
	Password string `json:"password"` // Password konfirmasi
}

// ==========================
// CHANGE EMAIL HANDLER (BARU)
// ==========================
func ChangeEmailHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Ambil User ID dari JWT
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		var req ChangeEmailRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Format request tidak valid"})
		}

		// Validasi Input Kosong
		if req.NewEmail == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Email baru wajib diisi"})
		}
		if req.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Masukkan password untuk konfirmasi"})
		}

		// 1. Ambil data user untuk verifikasi password lama
		user, err := GetUserByID(db, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		// 2. Cek Password Konfirmasi
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Password konfirmasi salah"})
		}

		// 3. Cek apakah email sudah dipakai user LAIN
		isTaken, err := IsEmailTaken(db, req.NewEmail, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memvalidasi email"})
		}
		if isTaken {
			return c.Status(400).JSON(fiber.Map{"error": "Email sudah digunakan oleh pengguna lain"})
		}

		// 4. Lakukan Update
		if err := UpdateEmail(db, userID, req.NewEmail); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui email"})
		}

		return c.JSON(fiber.Map{
			"message": "Email berhasil diperbarui",
			"email":   req.NewEmail,
		})
	}
}
