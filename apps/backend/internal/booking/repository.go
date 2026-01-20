package booking

import (
	"database/sql"
	"time"
)

// ========================================================
// ENTITY / DTO
// ========================================================

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
	AdminName    string    `json:"admin_name"`
}

// ========================================================
// INSERT BOOKING
// ========================================================

func Insert(db *sql.DB, b Booking) error {
	_, err := db.Exec(`
		INSERT INTO bookings (
			id,
			user_id,
			facility_id,
			start_time,
			end_time,
			purpose,
			status,
			created_by,
			created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $2, NOW())
	`, b.ID, b.UserID, b.FacilityID, b.StartTime, b.EndTime, b.Purpose)

	return err
}

// ========================================================
// FIND BOOKING BY ID
// ========================================================

func FindByID(db *sql.DB, id string) (status string, ownerID string, err error) {
	err = db.QueryRow(`
		SELECT status, user_id
		FROM bookings
		WHERE id = $1
		  AND deleted_at IS NULL
	`, id).Scan(&status, &ownerID)

	return
}

// ========================================================
// UPDATE STATUS (ADMIN)
// ========================================================

func UpdateStatus(db *sql.DB, bookingID string, status string, adminID string) error {
	_, err := db.Exec(`
		UPDATE bookings
		SET status = $1,
		    updated_at = NOW(),
		    updated_by = $2
		WHERE id = $3
		  AND deleted_at IS NULL
	`, status, adminID, bookingID)

	return err
}

// ========================================================
// CANCEL BOOKING (USER)
// ========================================================

func UpdateStatusCancel(db *sql.DB, bookingID string, userID string) error {
	_, err := db.Exec(`
		UPDATE bookings
		SET status = 'canceled',
		    updated_at = NOW(),
		    updated_by = $1
		WHERE id = $2
		  AND user_id = $1
		  AND deleted_at IS NULL
	`, userID, bookingID)

	return err
}

// ========================================================
// GET USER BOOKINGS
// ========================================================

func FindByUserID(db *sql.DB, userID string) ([]BookingResponse, error) {
	// PERBAIKAN: Gunakan CASE WHEN agar booking yang sudah lewat dianggap 'completed'
	rows, err := db.Query(`
		SELECT
			b.id,
			b.user_id,
			COALESCE(u.name, 'Unknown User'),
			b.facility_id,
			COALESCE(f.name, 'Unknown Facility'),
			b.start_time,
			b.end_time,
			CASE 
				WHEN b.status = 'approved' AND b.end_time < NOW() THEN 'completed'
				ELSE b.status 
			END,
			COALESCE(b.purpose, '-'),
			b.created_at,
			COALESCE(admin.name, '') AS admin_name
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.user_id = $1
		  AND b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`, userID)

	if err != nil {
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
			&b.AdminName,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return bookings, nil
}

// ========================================================
// GET ALL BOOKINGS (ADMIN)
// ========================================================

func GetAll(db *sql.DB, statusFilter string) ([]BookingResponse, error) {
	// PERBAIKAN: Gunakan CASE WHEN agar booking yang sudah lewat dianggap 'completed'
	// Status filter juga harus mengakomodasi 'completed' jika ingin memfilter data history
	rows, err := db.Query(`
		SELECT
			b.id,
			b.user_id,
			COALESCE(u.name, 'Unknown User'),
			b.facility_id,
			COALESCE(f.name, 'Unknown Facility'),
			b.start_time,
			b.end_time,
			CASE 
				WHEN b.status = 'approved' AND b.end_time < NOW() THEN 'completed'
				ELSE b.status 
			END as current_status,
			COALESCE(b.purpose, '-'),
			b.created_at,
			COALESCE(admin.name, '') AS admin_name
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.deleted_at IS NULL
		  AND ($1 = '' 
		       OR ($1 = 'completed' AND b.status = 'approved' AND b.end_time < NOW())
		       OR (b.status::text = $1 AND NOT (b.status = 'approved' AND b.end_time < NOW()))
		      )
		ORDER BY b.created_at DESC
	`, statusFilter)

	if err != nil {
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
			&b.AdminName,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return bookings, nil
}
