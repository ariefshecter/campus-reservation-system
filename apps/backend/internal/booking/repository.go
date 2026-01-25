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

// 1. Tambahkan Struct Profile (Sama persis dengan package user)
type Profile struct {
	FullName       string `json:"full_name"`
	PhoneNumber    string `json:"phone_number"`
	Address        string `json:"address"`
	AvatarURL      string `json:"avatar_url"`
	Gender         string `json:"gender"`
	IdentityNumber string `json:"identity_number"`
	Department     string `json:"department"`
	Position       string `json:"position"`
}

// 2. Tambahkan Struct BookingUser untuk menampung data user + profile nested
type BookingUser struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Profile Profile `json:"profile"`
}

// 3. Update BookingResponse agar menyertakan object User
type BookingResponse struct {
	ID           string      `json:"id"`
	UserID       string      `json:"user_id"`   // Tetap ada untuk backward compatibility
	UserName     string      `json:"user_name"` // Tetap ada untuk backward compatibility
	User         BookingUser `json:"user"`      // <--- FIELD BARU: Object User Lengkap
	FacilityID   string      `json:"facility_id"`
	FacilityName string      `json:"facility_name"`
	StartTime    time.Time   `json:"start_time"`
	EndTime      time.Time   `json:"end_time"`
	Status       string      `json:"status"`
	Purpose      string      `json:"purpose"`
	CreatedAt    time.Time   `json:"created_at"`
	AdminName    string      `json:"admin_name"`
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
	// PERBAIKAN: Tambahkan ::text pada ELSE b.status
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
				ELSE b.status::text 
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
	// Query kita update untuk LEFT JOIN ke profiles
	rows, err := db.Query(`
        SELECT
            b.id,
            -- Data User Lengkap (User + Profile)
            u.id, u.name, u.email,
            COALESCE(p.full_name, ''),
            COALESCE(p.phone_number, ''),
            COALESCE(p.address, ''),
            COALESCE(p.avatar_url, ''),
            COALESCE(p.gender, ''),
            COALESCE(p.identity_number, ''),
            COALESCE(p.department, ''),
            COALESCE(p.position, ''),
            -- Data Fasilitas
            b.facility_id, COALESCE(f.name, 'Unknown Facility'),
            -- Data Booking
            b.start_time, b.end_time,
            CASE 
                WHEN b.status = 'approved' AND b.end_time < NOW() THEN 'completed'
                ELSE b.status::text 
            END as current_status,
            COALESCE(b.purpose, '-'),
            b.created_at,
            COALESCE(admin.name, '') AS admin_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id -- JOIN profile ditambahkan
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
			// Scan ke struct User -> Profile
			&b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName,
			&b.User.Profile.PhoneNumber,
			&b.User.Profile.Address,
			&b.User.Profile.AvatarURL,
			&b.User.Profile.Gender,
			&b.User.Profile.IdentityNumber,
			&b.User.Profile.Department,
			&b.User.Profile.Position,
			// Scan data lainnya
			&b.FacilityID, &b.FacilityName,
			&b.StartTime, &b.EndTime, &b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
		); err != nil {
			return nil, err
		}

		// Isi field legacy
		b.UserID = b.User.ID
		b.UserName = b.User.Name

		bookings = append(bookings, b)
	}

	return bookings, nil
}

// ========================================================
// CEK BENTROK (UNTUK DETAIL ERROR)
// ========================================================

func GetConflictingBooking(db *sql.DB, facilityID string, start, end time.Time) (*time.Time, *time.Time, error) {
	var conflictStart, conflictEnd time.Time

	// Query cari booking yg statusnya approved dan waktunya beririsan
	// Logika Overlap: (RequestStart < ExistingEnd) AND (RequestEnd > ExistingStart)
	err := db.QueryRow(`
		SELECT start_time, end_time
		FROM bookings
		WHERE facility_id = $1
		  AND (status = 'approved' OR status = 'pending') 
		  AND deleted_at IS NULL
		  AND ($2 < end_time AND $3 > start_time)
		LIMIT 1
	`, facilityID, start, end).Scan(&conflictStart, &conflictEnd)

	if err == sql.ErrNoRows {
		return nil, nil, nil // Tidak ada bentrok
	}
	if err != nil {
		return nil, nil, err
	}

	return &conflictStart, &conflictEnd, nil
}
