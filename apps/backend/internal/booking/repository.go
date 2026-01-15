package booking

import (
	"database/sql"
	"time"
)

type Booking struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	FacilityID string    `json:"facility_id"`
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// ==========================
// INSERT BOOKING (Audit: created_by)
// ==========================
func Insert(db *sql.DB, b Booking) error {
	// created_by diisi dengan user_id karena user membuat booking untuk dirinya sendiri
	_, err := db.Exec(`
		INSERT INTO bookings (
			user_id,
			facility_id,
			start_time,
			end_time,
			status,
			created_by
		)
		VALUES ($1, $2, $3, $4, 'pending', $1)
	`,
		b.UserID,
		b.FacilityID,
		b.StartTime,
		b.EndTime,
	)
	return err
}

// ==========================
// GET BY ID (Helper untuk Service)
// ==========================
func FindByID(db *sql.DB, id string) (string, string, error) {
	var status, ownerID string
	// Cek deleted_at is null
	err := db.QueryRow(`
		SELECT status, user_id 
		FROM bookings 
		WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(&status, &ownerID)

	return status, ownerID, err
}

// ==========================
// UPDATE STATUS (Audit: updated_by)
// ==========================
// Digunakan untuk Admin Approve/Reject
func UpdateStatus(db *sql.DB, bookingID string, status string, adminID string) error {
	_, err := db.Exec(`
		UPDATE bookings
		SET status = $1,
		    updated_at = now(),
		    updated_by = $2
		WHERE id = $3 AND deleted_at IS NULL
	`, status, adminID, bookingID)
	return err
}

// ==========================
// CANCEL BOOKING (Audit: updated_by)
// ==========================
// Digunakan oleh User. Cancel adalah perubahan status, bukan hapus data.
func UpdateStatusCancel(db *sql.DB, bookingID string, userID string) error {
	_, err := db.Exec(`
		UPDATE bookings
		SET status = 'canceled',
		    updated_at = now(),
		    updated_by = $1
		WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL
	`, userID, bookingID)
	return err
}

// ==========================
// GET USER BOOKINGS
// ==========================
func FindByUserID(db *sql.DB, userID string) ([]Booking, error) {
	rows, err := db.Query(`
		SELECT id, user_id, facility_id, start_time, end_time, status, created_at
		FROM bookings
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []Booking
	for rows.Next() {
		var b Booking
		err := rows.Scan(
			&b.ID,
			&b.UserID,
			&b.FacilityID,
			&b.StartTime,
			&b.EndTime,
			&b.Status,
			&b.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}

// ==========================
// CEK TABRAKAN JADWAL (Helper untuk Notifikasi)
// ==========================
func FindOverlappingBooking(db *sql.DB, facilityID string, start, end time.Time) (*time.Time, error) {
	var conflictEndTime time.Time

	// Query ini mencari booking yang:
	// 1. Fasilitas sama
	// 2. Status 'pending' atau 'approved'
	// 3. Waktunya beririsan (operator &&)
	// 4. Tidak terhapus (deleted_at NULL)
	err := db.QueryRow(`
		SELECT end_time
		FROM bookings
		WHERE facility_id = $1
		  AND status IN ('pending', 'approved')
		  AND deleted_at IS NULL
		  AND tstzrange(start_time, end_time) && tstzrange($2, $3)
		LIMIT 1
	`, facilityID, start, end).Scan(&conflictEndTime)

	if err != nil {
		if err == sql.ErrNoRows {
			// Aman: Tidak ada booking yang bentrok
			return nil, nil
		}
		// Error database lain
		return nil, err
	}

	// Ada bentrok: kembalikan waktu selesai booking tersebut
	return &conflictEndTime, nil
}
