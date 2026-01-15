package booking

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// CREATE BOOKING (USER)
// ==========================
func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var b Booking

		// Ambil user_id dari JWT
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		// Parse body
		if err := c.BodyParser(&b); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		b.UserID = userID

		// Panggil service (logic validasi ada di sana)
		if err := CreateBooking(db, b); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "booking berhasil dibuat (menunggu persetujuan)",
		})
	}
}

// ==========================
// LIST BOOKING MILIK USER
// ==========================
func MyBookingsHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		data, err := GetUserBookings(db, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal mengambil booking",
			})
		}

		return c.JSON(data)
	}
}

// ==========================
// CANCEL BOOKING (USER)
// ==========================
func CancelHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")

		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		if err := CancelBooking(db, bookingID, userID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "booking berhasil dibatalkan",
		})
	}
}

// ==========================
// APPROVE / REJECT BOOKING (ADMIN)
// ==========================
type UpdateStatusRequest struct {
	Status string `json:"status"`
}

func UpdateStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")

		// 1. Ambil admin ID dari JWT (untuk Audit Trail updated_by)
		adminID, ok := c.Locals("user_id").(string)
		if !ok || adminID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "admin tidak terautentikasi",
			})
		}

		// 2. Parse Body
		var req UpdateStatusRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "format data tidak valid",
			})
		}

		// 3. Panggil Service dengan adminID
		if err := UpdateBookingStatus(db, bookingID, req.Status, adminID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "status booking berhasil diperbarui",
		})
	}
}
