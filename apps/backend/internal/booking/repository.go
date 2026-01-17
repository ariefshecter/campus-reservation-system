package booking

import (
	"database/sql"
	"fmt"
	"time"
)

// Struct Input
type Booking struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	FacilityID string    `json:"facility_id"`
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	Status     string    `json:"status"`
	Purpose    string    `json:"purpose"`
	CreatedAt  time.Time `json:"created_at"`
}

// Struct Response (UPDATE: Tambah AdminName)
type BookingResponse struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	UserName     string    `json:"user_name"`
	FacilityID   string    `json:"facility_id"`
	FacilityName string    `json:"facility_name"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	Status       string    `json:"status"`
	Purpose      string    `json:"purpose"`
	CreatedAt    time.Time `json:"created_at"`
	AdminName    string    `json:"admin_name"` // <-- Field Baru
}

// ==========================
// INSERT
// ==========================
func Insert(db *sql.DB, b Booking) error {
	_, err := db.Exec(`
		INSERT INTO bookings (
			id, user_id, facility_id, start_time, end_time, purpose, status, created_by, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $2, NOW())
	`, b.ID, b.UserID, b.FacilityID, b.StartTime, b.EndTime, b.Purpose)
	return err
}

// ==========================
// FIND BY ID
// ==========================
func FindByID(db *sql.DB, id string) (string, string, error) {
	var status, ownerID string
	err := db.QueryRow(`
		SELECT status, user_id FROM bookings WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(&status, &ownerID)
	return status, ownerID, err
}

// ==========================
// UPDATE STATUS (Admin)
// ==========================
func UpdateStatus(db *sql.DB, bookingID string, status string, adminID string) error {
	_, err := db.Exec(`
		UPDATE bookings SET status = $1, updated_at = now(), updated_by = $2
		WHERE id = $3 AND deleted_at IS NULL
	`, status, adminID, bookingID)
	return err
}

// ==========================
// CANCEL (User)
// ==========================
func UpdateStatusCancel(db *sql.DB, bookingID string, userID string) error {
	_, err := db.Exec(`
		UPDATE bookings SET status = 'canceled', updated_at = now(), updated_by = $1
		WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL
	`, userID, bookingID)
	return err
}

// ==========================
// GET USER BOOKINGS (History)
// ==========================
func FindByUserID(db *sql.DB, userID string) ([]BookingResponse, error) {
	query := `
		SELECT 
			b.id, 
			b.user_id, 
			COALESCE(u.name, 'Unknown User'), 
			b.facility_id, 
			COALESCE(f.name, 'Unknown Facility'), 
			b.start_time, 
			b.end_time, 
			b.status, 
			COALESCE(b.purpose, '-'), 
			b.created_at,
			COALESCE(admin.name, '') as admin_name
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.user_id = $1 AND b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		if err := rows.Scan(
			&b.ID, &b.UserID, &b.UserName, &b.FacilityID, &b.FacilityName,
			&b.StartTime, &b.EndTime, &b.Status, &b.Purpose, &b.CreatedAt,
			&b.AdminName, // <-- Scan field baru
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}

// ==========================
// GET ALL BOOKINGS (ADMIN)
// ==========================
func GetAll(db *sql.DB, statusFilter string) ([]BookingResponse, error) {
	// UPDATE QUERY: LEFT JOIN ke users (sebagai admin) berdasarkan updated_by
	query := `
		SELECT 
			b.id, 
			b.user_id, 
			COALESCE(u.name, 'Unknown User'), 
			b.facility_id, 
			COALESCE(f.name, 'Unknown Facility'), 
			b.start_time, 
			b.end_time, 
			b.status, 
			COALESCE(b.purpose, '-'), 
			b.created_at,
			COALESCE(admin.name, '') as admin_name
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id 
		WHERE b.deleted_at IS NULL
		AND ($1 = '' OR b.status::text = $1) 
		ORDER BY b.created_at DESC
	`
	// LEFT JOIN: Karena booking yang masih "pending", updated_by-nya NULL (belum ada admin yg approve)

	rows, err := db.Query(query, statusFilter)
	if err != nil {
		fmt.Println("❌ ERROR QUERY:", err)
		return nil, err
	}
	defer rows.Close()

	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		if err := rows.Scan(
			&b.ID,
			&b.UserID,
			&b.UserName,
			&b.FacilityID,
			&b.FacilityName,
			&b.StartTime,
			&b.EndTime,
			&b.Status,
			&b.Purpose,
			&b.CreatedAt,
			&b.AdminName, // <-- Scan field baru
		); err != nil {
			fmt.Println("❌ ERROR SCAN:", err)
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func FindOverlappingBooking(db *sql.DB, facilityID string, start, end time.Time) (*time.Time, error) {
	var conflictEndTime time.Time
	err := db.QueryRow(`
		SELECT end_time FROM bookings
		WHERE facility_id = $1
		  AND status IN ('pending', 'approved')
		  AND deleted_at IS NULL
		  AND tstzrange(start_time, end_time) && tstzrange($2, $3)
		LIMIT 1
	`, facilityID, start, end).Scan(&conflictEndTime)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &conflictEndTime, nil
}
