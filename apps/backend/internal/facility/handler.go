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

		// Panggil service
		if err := CreateFacility(db, f); err != nil {
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

		// Panggil service
		if err := UpdateFacility(db, id, f); err != nil {
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

		if err := DeactivateFacility(db, id); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "fasilitas berhasil dinonaktifkan",
		})
	}
}
