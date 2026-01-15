package facility

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// CREATE FASILITAS (ADMIN)
// ==========================
func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var f Facility

		// Parse body JSON
		if err := c.BodyParser(&f); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		// Ambil user_id dari JWT (diset oleh middleware auth)
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		// Panggil service dengan userID
		if err := CreateFacility(db, f, userID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "fasilitas berhasil dibuat",
		})
	}
}

// ==========================
// LIST FASILITAS (USER & ADMIN)
// ==========================
func ListHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Public read, tidak butuh user_id untuk audit log
		data, err := GetAllFacilities(db)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal mengambil data fasilitas",
			})
		}

		return c.JSON(data)
	}
}

// ==========================
// UPDATE FASILITAS (ADMIN)
// ==========================
func UpdateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		var f Facility

		// Parse body
		if err := c.BodyParser(&f); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		// Ambil user_id dari JWT
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		// Panggil service dengan userID
		if err := UpdateFacility(db, id, f, userID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "fasilitas berhasil diperbarui",
		})
	}
}

// ==========================
// NONAKTIFKAN FASILITAS (ADMIN)
// ==========================
func DeactivateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// Ambil user_id dari JWT
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		// Panggil service dengan userID
		if err := DeactivateFacility(db, id, userID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "fasilitas berhasil dinonaktifkan",
		})
	}
}
