package booking

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"image"
	"image/png"
	"math/big"
	"strings"
	"time"

	"github.com/fogleman/gg"
	"github.com/skip2/go-qrcode"
	"github.com/xuri/excelize/v2"
)

// generateTicketCode menghasilkan kode unik seperti: TK-20260126-A1B2C
func generateTicketCode() string {
	dateStr := time.Now().Format("20060102")
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, 5)
	for i := range result {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		result[i] = charset[num.Int64()]
	}
	return fmt.Sprintf("TK-%s-%s", dateStr, string(result))
}

// ==========================
// CREATE BOOKING (USER)
// ==========================
func CreateBooking(db *sql.DB, b Booking) error {
	if b.UserID == "" {
		return errors.New("user tidak valid")
	}

	if b.FacilityID == "" {
		return errors.New("fasilitas tidak valid")
	}

	if !b.StartTime.Before(b.EndTime) {
		return errors.New("waktu mulai harus sebelum waktu selesai")
	}

	// Menambahkan batas akhir otomatis +10 menit dari input user sesuai kesepakatan
	b.EndTime = b.EndTime.Add(10 * time.Minute)

	// 1. CEK BENTROK
	conflictStart, conflictEnd, err := GetConflictingBooking(db, b.FacilityID, b.StartTime, b.EndTime)
	if err != nil {
		return errors.New("gagal mengecek ketersediaan ruangan")
	}

	if conflictStart != nil {
		// Fix Timezone untuk Error Message
		loc, _ := time.LoadLocation("Asia/Jakarta")
		tStart := conflictStart.In(loc).Format("02 Jan 2006, 15:04")
		tEnd := conflictEnd.In(loc).Format("15:04")

		return fmt.Errorf("Ruangan sudah dibooking pada: %s - %s WIB. Silakan pilih jam lain.", tStart, tEnd)
	}

	// 2. GENERATE TICKET CODE OTOMATIS
	b.TicketCode = sql.NullString{
		String: generateTicketCode(),
		Valid:  true,
	}
	b.IsCheckedIn = false

	// 3. INSERT KE DATABASE
	if err := Insert(db, b); err != nil {
		return err
	}

	return nil
}

// ==========================
// CANCEL BOOKING (USER)
// ==========================
func CancelBooking(db *sql.DB, bookingID string, userID string) error {
	status, owner, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	if owner != userID {
		return errors.New("tidak punya hak membatalkan booking ini")
	}

	if status != "pending" {
		return errors.New("hanya booking pending yang bisa dibatalkan")
	}

	return UpdateStatusCancel(db, bookingID, userID)
}

// ==========================
// APPROVE / REJECT BOOKING (ADMIN)
// ==========================
// [DIPERBARUI] Menambahkan parameter rejectionReason
func UpdateBookingStatus(db *sql.DB, bookingID string, newStatus string, rejectionReason string, adminID string) error {
	if newStatus != "approved" && newStatus != "rejected" {
		return errors.New("status tidak valid")
	}

	currentStatus, _, err := FindByID(db, bookingID)
	if err != nil {
		return errors.New("booking tidak ditemukan")
	}

	if currentStatus != "pending" {
		return errors.New("status booking tidak bisa diubah karena sudah diproses")
	}

	// Jika status Approved, kosongkan rejection reason
	if newStatus == "approved" {
		rejectionReason = ""
	}

	// MEKANISME RETRY (Maksimal 3 kali percobaan)
	// Berguna jika Random Code yang digenerate kebetulan sama dengan yang sudah ada
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		var ticketCode string
		if newStatus == "approved" {
			ticketCode = generateTicketCode()
		} else {
			ticketCode = "" // Akan dikonversi jadi NULL di repository
		}

		// Panggil Repository
		err := UpdateStatus(db, bookingID, newStatus, rejectionReason, adminID, ticketCode)

		if err == nil {
			return nil // Sukses!
		}

		// Cek jika errornya adalah "Duplicate Key" pada ticket_code
		if strings.Contains(err.Error(), "bookings_ticket_code_key") {
			// Jika status REJECTED (ticketCode kosong) tapi masih duplicate,
			// berarti masalah ada di NULL handling repository (seharusnya sudah fix dengan langkah 1).
			// Kita hanya retry jika status APPROVED (karena generate random code).
			if newStatus == "approved" {
				continue // Coba generate kode baru dan simpan ulang
			}
		}

		// Jika error lain, langsung kembalikan error
		return err
	}

	return errors.New("gagal memproses booking: terjadi duplikasi kode tiket berulang kali")
}

// ==========================
// SCAN TICKET (CHECK-IN & CHECK-OUT)
// ==========================
func CheckInTicket(db *sql.DB, ticketCode string) error {
	// 1. Cari booking berdasarkan kode tiket
	booking, err := FindByTicketCode(db, ticketCode)
	if err != nil {
		return errors.New("kode tiket tidak valid atau tidak ditemukan")
	}

	// 2. Validasi Dasar: Apakah booking disetujui?
	if booking.Status != "approved" {
		return errors.New("tiket tidak valid karena booking belum disetujui")
	}

	// [FIX TIMEZONE] Load lokasi WIB untuk validasi waktu
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local // Fallback jika timezone server bermasalah
	}

	now := time.Now().In(loc)
	startTimeWIB := booking.StartTime.In(loc)
	endTimeWIB := booking.EndTime.In(loc)

	// ==========================================
	// ALUR CHECK-OUT (Jika sudah pernah Check-in)
	// ==========================================
	if booking.IsCheckedIn {
		if booking.IsCheckedOut {
			return errors.New("tiket ini sudah selesai digunakan (Sudah Check-Out)")
		}

		// Menghitung jadwal asli (mengurangi kembali buffer 10 menit)
		originalScheduleEnd := endTimeWIB.Add(-10 * time.Minute)

		// Toleransi keterlambatan adalah 5 menit dari jadwal asli
		gracePeriod := 5 * time.Minute
		deadline := originalScheduleEnd.Add(gracePeriod)

		attendanceStatus := "on_time"
		if now.After(deadline) {
			attendanceStatus = "late"
		}

		// Memperbarui data Check-out di database dengan status kehadiran yang sesuai
		if err := UpdateCheckOut(db, booking.ID, attendanceStatus); err != nil {
			return errors.New("gagal memproses check-out")
		}

		if attendanceStatus == "late" {
			return fmt.Errorf("Check-Out Berhasil! (Terlambat: melewati batas toleransi 5 menit)")
		}
		return nil
	}

	// ==========================================
	// ALUR CHECK-IN (Jika belum pernah Check-in)
	// ==========================================

	// Validasi rentang waktu: Check-in diperbolehkan sejak StartTime hingga EndTime (+10m buffer)
	if now.Before(startTimeWIB) {
		return fmt.Errorf("Check-in gagal. Booking Anda baru dimulai jam %s WIB", startTimeWIB.Format("15:04"))
	}
	if now.After(endTimeWIB) {
		return errors.New("Check-in gagal. Waktu booking Anda telah berakhir (Mangkir)")
	}

	return UpdateCheckIn(db, booking.ID)
}

// ==========================================
// WORKER: AUTO CHECK-OUT (Sistem)
// ==========================================
func RunAutoCheckout(db *sql.DB) error {
	// Memanggil fungsi repository yang sebenarnya
	return ProcessExpiredBookings(db)
}

// ==========================
// GET USER BOOKINGS
// ==========================
func GetUserBookings(db *sql.DB, userID string) ([]BookingResponse, error) {
	return FindByUserID(db, userID)
}

// ==========================
// TICKET GENERATOR (IMAGE)
// ==========================

func GenerateTicketImage(b BookingResponse) ([]byte, error) {
	// 1. Setup Kanvas (Ukuran Portrait: 600x1000 pixel)
	const W = 600
	const H = 1000
	dc := gg.NewContext(W, H)

	// Warna Background Putih
	dc.SetRGB(1, 1, 1)
	dc.Clear()

	// 2. Load Font
	fontPath := "assets/fonts/Arial.ttf"

	setFont := func(size float64) {
		if err := dc.LoadFontFace(fontPath, size); err != nil {
			fmt.Println("Warning: Font not found, text might fail to render.", err)
		}
	}

	// 3. Header: "UniSpace Ticket"
	dc.SetRGB(0, 0, 0) // Hitam
	setFont(40)
	dc.DrawStringAnchored("UniSpace Ticket", W/2, 80, 0.5, 0.5)

	// Garis Pemisah Header
	dc.SetLineWidth(2)
	dc.SetRGB(0.8, 0.8, 0.8) // Abu-abu muda
	dc.DrawLine(50, 130, W-50, 130)
	dc.Stroke()

	// 4. Isi Tiket (Nama, Identitas, Ruangan, Waktu)
	startY := 200.0
	gapY := 90.0

	fields := []struct {
		Label string
		Value string
	}{
		{"NAMA PEMESAN", strings.ToUpper(b.UserName)},
		{"IDENTITAS (NIM/NIP)", b.User.Profile.IdentityNumber},
		{"RUANGAN", strings.ToUpper(b.FacilityName)},
		{"WAKTU PENGGUNAAN", formatDateIndo(b.StartTime, b.EndTime)}, // <--- Ini yang diperbaiki
	}

	for i, f := range fields {
		yPos := startY + (float64(i) * gapY)

		dc.SetRGB(0.5, 0.5, 0.5)
		setFont(14)
		dc.DrawString(f.Label, 50, yPos)

		dc.SetRGB(0, 0, 0)
		setFont(22)
		dc.DrawStringAnchored(f.Value, 50, yPos+30, 0, 0)
	}

	// 5. Generate QR Code
	qrCodeData, err := qrcode.Encode(b.TicketCode, qrcode.Medium, 256)
	if err != nil {
		return nil, errors.New("gagal membuat QR code")
	}

	imgQR, _, err := image.Decode(bytes.NewReader(qrCodeData))
	if err != nil {
		return nil, errors.New("gagal membaca gambar QR")
	}

	// Tempel QR Code di Bawah Tengah
	qrY := 700.0
	dc.DrawImageAnchored(imgQR, W/2, int(qrY), 0.5, 0.5)

	// 6. Kode Tiket
	dc.SetRGB(0, 0, 0)
	setFont(18)
	dc.DrawStringAnchored(b.TicketCode, W/2, qrY+140, 0.5, 0.5)

	// Status
	dc.SetRGB(0, 0.6, 0)
	setFont(16)
	dc.DrawStringAnchored("STATUS: APPROVED", W/2, qrY+170, 0.5, 0.5)

	// 7. Render ke Buffer PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, dc.Image()); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// [FIX TIMEZONE] Helper: Format Tanggal Indonesia dengan Konversi WIB
func formatDateIndo(start, end time.Time) string {
	// KONVERSI KE WIB (Asia/Jakarta)
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		fmt.Println("Warning: Timezone Asia/Jakarta not found, using Local.")
		loc = time.Local
	}
	start = start.In(loc)
	end = end.In(loc)

	days := []string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}
	months := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

	dayStr := days[start.Weekday()]
	monthStr := months[start.Month()]
	dateStr := fmt.Sprintf("%d %s %d", start.Day(), monthStr, start.Year())

	timeStr := fmt.Sprintf("%s - %s WIB", start.Format("15.04"), end.Format("15.04"))

	return fmt.Sprintf("%s, %s (%s)", dayStr, dateStr, timeStr)
}

// ==========================
// EXCEL REPORT GENERATOR
// ==========================
func GenerateExcelReport(bookings []BookingResponse, startDate, endDate string) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheetName := "Laporan Kehadiran"
	index, _ := f.NewSheet(sheetName)
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// 1. Header Judul
	f.MergeCell(sheetName, "A1", "I1")
	f.SetCellValue(sheetName, "A1", fmt.Sprintf("LAPORAN KEHADIRAN PENGGUNAAN FASILITAS (%s s/d %s)", startDate, endDate))

	styleTitle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "I1", styleTitle)

	// 2. Header Kolom
	headers := []string{"No", "Nama User", "NIM/NIP", "Fasilitas", "Tanggal", "Jadwal", "Check-In", "Check-Out", "Status Kehadiran"}
	columns := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I"}

	for i, h := range headers {
		cell := fmt.Sprintf("%s3", columns[i])
		f.SetCellValue(sheetName, cell, h)
	}

	// 3. Style Header
	styleHeader, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#FFFFCC"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A3", "I3", styleHeader)

	// [FIX TIMEZONE] Load lokasi WIB untuk Excel
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	// 4. Isi Data
	row := 4
	for i, b := range bookings {
		// [FIX TIMEZONE] Konversi Waktu ke WIB
		startTime := b.StartTime.In(loc)
		endTime := b.EndTime.In(loc)

		// Format Data
		dateStr := startTime.Format("02/01/2006")
		scheduleStr := fmt.Sprintf("%s - %s", startTime.Format("15:04"), endTime.Format("15:04"))

		checkInStr := "-"
		if b.CheckedInAt != nil {
			checkInStr = b.CheckedInAt.In(loc).Format("15:04:05") // [FIX TIMEZONE]
		}

		checkOutStr := "-"
		if b.CheckedOutAt != nil {
			checkOutStr = b.CheckedOutAt.In(loc).Format("15:04:05") // [FIX TIMEZONE]
		}

		status := "Unknown"
		switch b.AttendanceStatus {
		case "on_time":
			status = "Tepat Waktu"
		case "late":
			status = "Terlambat"
		case "no_show":
			status = "Tidak Hadir"
		default:
			if b.IsCheckedIn && !b.IsCheckedOut {
				status = "Sedang Berjalan"
			}
			if !b.IsCheckedIn && b.Status == "approved" {
				status = "Belum Hadir"
			}
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), b.UserName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), b.User.Profile.IdentityNumber)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), b.FacilityName)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), dateStr)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), scheduleStr)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), checkInStr)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), checkOutStr)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), status)

		row++
	}

	// Auto Width
	f.SetColWidth(sheetName, "B", "B", 25)
	f.SetColWidth(sheetName, "C", "C", 15)
	f.SetColWidth(sheetName, "D", "D", 20)
	f.SetColWidth(sheetName, "E", "F", 15)
	f.SetColWidth(sheetName, "I", "I", 15)

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}

	return buf, nil
}
