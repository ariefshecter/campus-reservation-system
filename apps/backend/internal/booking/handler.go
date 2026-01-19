package booking

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ========================================================
// REQUEST DTO
// ========================================================

type CreateBookingRequest struct {
	FacilityID string `json:"facility_id"`
	StartTime  string `json:"start_time"` // ISO 8601
	EndTime    string `json:"end_time"`   // ISO 8601
	Purpose    string `json:"purpose"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

// ========================================================
// HANDLER: CREATE BOOKING (USER)
// ========================================================

func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		var req CreateBookingRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Format request tidak valid",
			})
		}

		start, err1 := time.Parse(time.RFC3339, req.StartTime)
		end, err2 := time.Parse(time.RFC3339, req.EndTime)
		if err1 != nil || err2 != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Format tanggal salah. Gunakan ISO 8601 (contoh: 2026-01-20T10:00:00Z)",
			})
		}

		newBooking := Booking{
			ID:         uuid.New().String(),
			UserID:     userID,
			FacilityID: req.FacilityID,
			StartTime:  start,
			EndTime:    end,
			Purpose:    req.Purpose,
			Status:     "pending",
		}

		if err := CreateBooking(db, newBooking); err != nil {
			status, message := mapBookingError(err)
			return c.Status(status).JSON(fiber.Map{
				"error": message,
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "Booking berhasil dibuat, menunggu persetujuan admin",
			"data":    newBooking,
		})
	}
}

// ========================================================
// HANDLER: MY BOOKINGS (USER)
// ========================================================

func MyBookingsHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		bookings, err := GetUserBookings(db, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal memuat riwayat booking",
			})
		}

		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

// ========================================================
// HANDLER: LIST ALL BOOKINGS (ADMIN)
// ========================================================

func ListAllHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		statusFilter := c.Query("status")

		bookings, err := GetAll(db, statusFilter)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal memuat data booking",
			})
		}

		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

// ========================================================
// HANDLER: UPDATE STATUS (ADMIN)
// ========================================================

func UpdateStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		adminID := c.Locals("user_id").(string)

		var req UpdateStatusRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Format request tidak valid",
			})
		}

		if err := UpdateBookingStatus(db, bookingID, req.Status, adminID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "Status booking berhasil diperbarui",
		})
	}
}

// ========================================================
// HANDLER: CANCEL BOOKING (USER)
// ========================================================

func CancelHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		userID := c.Locals("user_id").(string)

		if err := CancelBooking(db, bookingID, userID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "Booking berhasil dibatalkan",
		})
	}
}

// ========================================================
// ERROR MAPPER (DB CONSTRAINT → USER MESSAGE)
// ========================================================

func mapBookingError(err error) (int, string) {
	msg := err.Error()

	switch {
	case strings.Contains(msg, "no_double_booking"):
		return fiber.StatusConflict, "Ruangan sudah dibooking pada waktu tersebut"

	case strings.Contains(msg, "no_user_overlap"):
		return fiber.StatusConflict, "Anda sudah memiliki booking lain di waktu yang sama"

	case strings.Contains(msg, "booking_operational_hours"):
		return fiber.StatusBadRequest, "Booking hanya dapat dilakukan antara jam 08.00 sampai 16.00"
	}

	return fiber.StatusBadRequest, msg
}
