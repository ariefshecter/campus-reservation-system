package booking

import (
	"bytes"
	"database/sql"
	"fmt"
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
		facilityID := c.Query("facility_id")
		userID := c.Query("user_id")

		bookings, err := GetAll(db, statusFilter, facilityID, userID)
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

func GetFacilityScheduleHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		facilityID := c.Params("id")

		schedules, err := GetScheduleByFacility(db, facilityID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Gagal memuat jadwal fasilitas",
			})
		}

		if schedules == nil {
			schedules = []ScheduleResponse{}
		}

		return c.JSON(schedules)
	}
}

// ========================================================
// HANDLER: DOWNLOAD TICKET IMAGE
// ========================================================
func DownloadTicketHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		bookingID := c.Params("id")

		// 1. Ambil Data Booking Lengkap
		bookingData, err := FindDetailByID(db, bookingID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Booking tidak ditemukan"})
		}

		// Validasi: Hanya booking approved/completed yang punya tiket
		if bookingData.Status != "approved" && bookingData.Status != "completed" {
			return c.Status(400).JSON(fiber.Map{"error": "Tiket belum tersedia (Status: " + bookingData.Status + ")"})
		}

		// 2. Generate Gambar Tiket (Memanggil Service)
		imgBytes, err := GenerateTicketImage(*bookingData)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat tiket: " + err.Error()})
		}

		// 3. Kirim Response Gambar (PNG)
		c.Set("Content-Type", "image/png")
		// c.Set("Content-Disposition", "attachment; filename=ticket-"+bookingData.TicketCode+".png") // Opsional: Force download

		return c.SendStream(bytes.NewReader(imgBytes))
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

// ========================================================
// HANDLER: ATTENDANCE LOGS (JSON & EXCEL)
// ========================================================

// GetAttendanceLogsHandler menampilkan data di tabel Admin
func GetAttendanceLogsHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		startDate := c.Query("start_date") // Format: YYYY-MM-DD
		endDate := c.Query("end_date")
		status := c.Query("status")

		logs, err := GetAttendanceLogs(db, startDate, endDate, status)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat log kehadiran"})
		}

		if logs == nil {
			logs = []BookingResponse{}
		}

		return c.JSON(logs)
	}
}

// ExportAttendanceHandler mendownload file Excel
func ExportAttendanceHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		startDate := c.Query("start_date")
		endDate := c.Query("end_date")
		status := c.Query("status")

		// 1. Ambil data
		logs, err := GetAttendanceLogs(db, startDate, endDate, status)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data untuk export"})
		}

		// 2. Generate Excel
		fileBuffer, err := GenerateExcelReport(logs, startDate, endDate)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat file excel: " + err.Error()})
		}

		// 3. Set Header Download
		filename := fmt.Sprintf("Laporan_Kehadiran_%s.xlsx", time.Now().Format("20060102_1504"))
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename="+filename)

		return c.SendStream(bytes.NewReader(fileBuffer.Bytes()))
	}
}
