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

// Request untuk Scan QR (Digunakan untuk In dan Out)
type CheckInRequest struct {
	TicketCode string `json:"ticket_code"`
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

		startHour := start.Hour()
		endHour := end.Hour()

		if startHour < 0 || endHour > 23 {
			return c.Status(400).JSON(fiber.Map{
				"error": "Booking hanya diperbolehkan antara jam 00.00 - 23.59",
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
// HANDLER: SCAN TICKET (ADMIN SCANNER - IN & OUT)
// ========================================================

func CheckInHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req CheckInRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Format scan tidak valid",
			})
		}

		if req.TicketCode == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Kode tiket kosong",
			})
		}

		// Jalankan logika Service
		err := CheckInTicket(db, req.TicketCode)

		if err != nil {
			msg := err.Error()

			// Jika sukses Check-out tapi Telat, Service melempar error string khusus
			if strings.Contains(msg, "Check-Out Berhasil!") {
				return c.Status(200).JSON(fiber.Map{
					"message": msg,
					"type":    "checkout_late",
				})
			}

			// Error validasi sungguhan
			return c.Status(400).JSON(fiber.Map{
				"error": msg,
			})
		}

		// Karena Service mengembalikan nil jika sukses tepat waktu,
		// Kita perlu cek status terakhir untuk menentukan pesan sukses.
		booking, _ := FindByTicketCode(db, req.TicketCode)

		message := "Check-In Berhasil! Silakan masuk ke ruangan."
		respType := "checkin"

		if booking.IsCheckedOut {
			message = "Check-Out Berhasil! Terima kasih telah menggunakan fasilitas."
			respType = "checkout_on_time"
		}

		return c.JSON(fiber.Map{
			"message": message,
			"type":    respType,
		})
	}
}

// ========================================================
// HANDLER LAIN TETAP
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

func mapBookingError(err error) (int, string) {
	msg := err.Error()

	if strings.Contains(msg, "Ruangan sudah dibooking pada") {
		return 409, msg
	}

	switch {
	case strings.Contains(msg, "no_double_booking"):
		return 409, "Ruangan sudah dibooking pada waktu tersebut"

	case strings.Contains(msg, "no_user_overlap"):
		return 409, "Anda sudah memiliki booking lain di waktu yang sama"
	}

	return 400, msg
}
