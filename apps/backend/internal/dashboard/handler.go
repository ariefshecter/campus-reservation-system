package dashboard

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// STRUCTS
// ==========================
type TopFacility struct {
	Name      string `json:"name"`
	BookCount int    `json:"book_count"`
}

type RecentBooking struct {
	User      string `json:"user_name"`
	Facility  string `json:"facility_name"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type PeakHour struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

type DashboardStats struct {
	TotalUsers      int             `json:"total_users"`
	TotalFacilities int             `json:"total_facilities"`
	PendingBookings int             `json:"pending_bookings"`
	ActiveBookings  int             `json:"active_bookings"`
	TopFacilities   []TopFacility   `json:"top_facilities"`
	RecentBookings  []RecentBooking `json:"recent_bookings"`
	PeakHours       []PeakHour      `json:"peak_hours"`
}

// ==========================
// LOGIC
// ==========================
func GetStats(db *sql.DB) (DashboardStats, error) {
	var stats DashboardStats

	// 1. Hitung Angka Utama
	db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'user'").Scan(&stats.TotalUsers)
	db.QueryRow("SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL").Scan(&stats.TotalFacilities)
	db.QueryRow("SELECT COUNT(*) FROM bookings WHERE status = 'pending'").Scan(&stats.PendingBookings)
	db.QueryRow("SELECT COUNT(*) FROM bookings WHERE status = 'approved'").Scan(&stats.ActiveBookings)

	// 2. Ambil 5 Fasilitas Terpopuler
	rows, err := db.Query(`
		SELECT f.name, COUNT(b.id) as total
		FROM bookings b
		JOIN facilities f ON b.facility_id = f.id
		WHERE b.status != 'rejected'
		GROUP BY f.name
		ORDER BY total DESC
		LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var tf TopFacility
			if err := rows.Scan(&tf.Name, &tf.BookCount); err == nil {
				stats.TopFacilities = append(stats.TopFacilities, tf)
			}
		}
	}

	// 3. Ambil 5 Aktivitas Terbaru
	recentRows, err := db.Query(`
		SELECT u.name, f.name, b.status, to_char(b.created_at, 'DD Mon YYYY HH24:MI')
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		ORDER BY b.created_at DESC
		LIMIT 5
	`)
	if err == nil {
		defer recentRows.Close()
		for recentRows.Next() {
			var rb RecentBooking
			if err := recentRows.Scan(&rb.User, &rb.Facility, &rb.Status, &rb.CreatedAt); err == nil {
				stats.RecentBookings = append(stats.RecentBookings, rb)
			}
		}
	}

	// 4. Hitung Jam Sibuk (Konversi UTC ke WIB Manual)
	hoursMap := make(map[int]int)
	for i := 0; i < 24; i++ {
		hoursMap[i] = 0
	}

	peakRows, err := db.Query(`
		SELECT EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*) 
		FROM bookings 
		WHERE status != 'rejected' 
		GROUP BY hour
	`)

	if err == nil {
		defer peakRows.Close()
		for peakRows.Next() {
			var utcHour, count int
			if err := peakRows.Scan(&utcHour, &count); err == nil {
				// LOGIC KONVERSI: UTC + 7 Jam = WIB
				wibHour := (utcHour + 7) % 24
				hoursMap[wibHour] += count
			}
		}
	}

	// Filter jam kerja kampus (08:00 - 17:00) untuk dikirim ke Frontend
	for h := 8; h <= 17; h++ {
		stats.PeakHours = append(stats.PeakHours, PeakHour{Hour: h, Count: hoursMap[h]})
	}

	return stats, nil
}

// ==========================
// HANDLER HTTP
// ==========================
func DashboardHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		stats, err := GetStats(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data statistik"})
		}
		return c.JSON(stats)
	}
}
