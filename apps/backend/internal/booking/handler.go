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
	StartTime  string `json:"start_time"` // YYYY-MM-DDTHH:MM:SS
	EndTime    string `json:"end_time"`
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
			return c.Status(400).JSON(fiber.Map{
				"error": "Format request tidak valid",
			})
		}

		// ===============================
		// PARSE TIME AS WIB
		// ===============================
		loc, err := time.LoadLocation("Asia/Jakarta")
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Timezone server tidak valid",
			})
		}

		layout := "2006-01-02T15:04:05"

		start, err1 := time.ParseInLocation(layout, req.StartTime, loc)
		end, err2 := time.ParseInLocation(layout, req.EndTime, loc)

		if err1 != nil || err2 != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Format tanggal salah (YYYY-MM-DDTHH:MM:SS)",
			})
		}

		if !start.Before(end) {
			return c.Status(400).JSON(fiber.Map{
				"error": "Jam mulai harus sebelum jam selesai",
			})
		}

		// ===============================
		// VALIDASI JAM OPERASIONAL (WIB)
		// ===============================
		startHour := start.Hour()
		endHour := end.Hour()

		if startHour < 8 || endHour > 16 {
			return c.Status(400).JSON(fiber.Map{
				"error": "Booking hanya diperbolehkan antara jam 08.00 - 16.00",
			})
		}

		// ===============================
		// CREATE BOOKING
		// ===============================
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
			status, msg := mapBookingError(err)
			return c.Status(status).JSON(fiber.Map{
				"error": msg,
			})
		}

		return c.Status(201).JSON(fiber.Map{
			"message": "Booking berhasil dibuat, menunggu persetujuan admin",
		})
	}
}

// ========================================================
// HANDLER LAIN TETAP (TIDAK DIUBAH)
// ========================================================

func MyBookingsHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		bookings, err := GetUserBookings(db, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Gagal memuat riwayat booking",
			})
		}

		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

func ListAllHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		statusFilter := c.Query("status")

		bookings, err := GetAll(db, statusFilter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Gagal memuat data booking",
			})
		}

		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

func UpdateStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		adminID := c.Locals("user_id").(string)

		var req UpdateStatusRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Format request tidak valid",
			})
		}

		if err := UpdateBookingStatus(db, bookingID, req.Status, adminID); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "Status booking berhasil diperbarui",
		})
	}
}

func CancelHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		userID := c.Locals("user_id").(string)

		if err := CancelBooking(db, bookingID, userID); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"message": "Booking berhasil dibatalkan",
		})
	}
}

// ========================================================
// ERROR MAPPING
// ========================================================

func mapBookingError(err error) (int, string) {
	msg := err.Error()

	// 1. Cek error detail dari Service (Ruangan bentrok)
	if strings.Contains(msg, "Ruangan sudah dibooking pada") {
		return 409, msg // 409 Conflict: Mengirim pesan asli yg ada jamnya
	}

	// 2. Cek error constraints dari Database (Fallback)
	switch {
	case strings.Contains(msg, "no_double_booking"):
		return 409, "Ruangan sudah dibooking pada waktu tersebut"

	case strings.Contains(msg, "no_user_overlap"):
		return 409, "Anda sudah memiliki booking lain di waktu yang sama"
	}

	// Default Bad Request
	return 400, msg
}
