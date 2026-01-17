package booking

import (
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Struct khusus untuk parsing Body Request saat Create
type CreateBookingRequest struct {
	FacilityID string `json:"facility_id"`
	StartTime  string `json:"start_time"` // Input String ISO 8601
	EndTime    string `json:"end_time"`
	Purpose    string `json:"purpose"`
}

// Struct khusus untuk parsing Body Request saat Update Status
type UpdateStatusRequest struct {
	Status string `json:"status"`
}

// ========================================================
// 1. HANDLER: CREATE BOOKING (USER)
// ========================================================
func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)
		var req CreateBookingRequest

		// 1. Parse JSON Input
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Format request tidak valid"})
		}

		// 2. Parse Time String ke Time Object
		start, err1 := time.Parse(time.RFC3339, req.StartTime)
		end, err2 := time.Parse(time.RFC3339, req.EndTime)

		if err1 != nil || err2 != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Format tanggal salah. Gunakan ISO 8601 (Contoh: 2026-01-20T10:00:00Z)",
			})
		}

		// 3. Construct Object Booking
		// ID dibuat disini agar bisa dikembalikan ke user
		newBooking := Booking{
			ID:         uuid.New().String(),
			UserID:     userID,
			FacilityID: req.FacilityID,
			StartTime:  start,
			EndTime:    end,
			Purpose:    req.Purpose,
			Status:     "pending",
		}

		// 4. Panggil Service (agar validasi bentrok jadwal berjalan)
		if err := CreateBooking(db, newBooking); err != nil {
			// Error dari service sudah berupa pesan yang user-friendly
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.Status(201).JSON(fiber.Map{
			"message": "Booking berhasil dibuat, menunggu persetujuan admin",
			"data":    newBooking,
		})
	}
}

// ========================================================
// 2. HANDLER: MY BOOKINGS (USER)
// ========================================================
func MyBookingsHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		// Panggil Service
		bookings, err := GetUserBookings(db, userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat history booking"})
		}

		// Pastikan return array kosong [] jika null
		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

// ========================================================
// 3. HANDLER: LIST ALL BOOKINGS (ADMIN)
// ========================================================
func ListAllHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Ambil query param ?status=... (pending, approved, rejected)
		// Jika kosong, berarti ambil semua
		statusFilter := c.Query("status")

		// Panggil Repository langsung (karena fungsi Get All Admin belum ada di service)
		// Menggunakan struct BookingResponse yang baru (ada join table)
		bookings, err := GetAll(db, statusFilter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat data booking"})
		}

		if bookings == nil {
			bookings = []BookingResponse{}
		}

		return c.JSON(bookings)
	}
}

// ========================================================
// 4. HANDLER: UPDATE STATUS (ADMIN)
// ========================================================
func UpdateStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		adminID := c.Locals("user_id").(string) // Audit log siapa admin yang approve

		var req UpdateStatusRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Panggil Service UpdateBookingStatus
		// Service akan memvalidasi apakah status valid dan apakah booking masih pending
		if err := UpdateBookingStatus(db, bookingID, req.Status, adminID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Status booking berhasil diperbarui"})
	}
}

// ========================================================
// 5. HANDLER: CANCEL BOOKING (USER)
// ========================================================
func CancelHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")
		userID := c.Locals("user_id").(string)

		// Panggil Service CancelBooking
		// Service akan memvalidasi apakah booking milik user ini dan statusnya masih pending
		if err := CancelBooking(db, bookingID, userID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Booking berhasil dibatalkan"})
	}
}
