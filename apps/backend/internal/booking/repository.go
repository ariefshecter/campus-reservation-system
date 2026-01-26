package booking

import (
	"database/sql"
	"time"
)

// ========================================================
// ENTITY / DTO
// ========================================================

type Booking struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	FacilityID  string         `json:"facility_id"`
	StartTime   time.Time      `json:"start_time"`
	EndTime     time.Time      `json:"end_time"`
	Status      string         `json:"status"`
	Purpose     string         `json:"purpose"`
	CreatedAt   time.Time      `json:"created_at"`
	TicketCode  sql.NullString `json:"ticket_code"`
	IsCheckedIn bool           `json:"is_checked_in"`
	CheckedInAt sql.NullTime   `json:"checked_in_at"`
	// Field baru untuk Check-out
	IsCheckedOut   bool           `json:"is_checked_out"`
	CheckedOutAt   sql.NullTime   `json:"checked_out_at"`
	CheckoutStatus sql.NullString `json:"checkout_status"`
}

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

type BookingUser struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Profile Profile `json:"profile"`
}

type BookingResponse struct {
	ID           string      `json:"id"`
	UserID       string      `json:"user_id"`
	UserName     string      `json:"user_name"`
	User         BookingUser `json:"user"`
	FacilityID   string      `json:"facility_id"`
	FacilityName string      `json:"facility_name"`
	StartTime    time.Time   `json:"start_time"`
	EndTime      time.Time   `json:"end_time"`
	Status       string      `json:"status"`
	Purpose      string      `json:"purpose"`
	CreatedAt    time.Time   `json:"created_at"`
	AdminName    string      `json:"admin_name"`
	TicketCode   string      `json:"ticket_code,omitempty"`
	IsCheckedIn  bool        `json:"is_checked_in"`
	CheckedInAt  *time.Time  `json:"checked_in_at,omitempty"`
	// Field baru untuk response Check-out
	IsCheckedOut   bool       `json:"is_checked_out"`
	CheckedOutAt   *time.Time `json:"checked_out_at,omitempty"`
	CheckoutStatus string     `json:"checkout_status,omitempty"`
}

// ========================================================
// REPOSITORY FUNCTIONS
// ========================================================

func Insert(db *sql.DB, b Booking) error {
	_, err := db.Exec(`
		INSERT INTO bookings (id, user_id, facility_id, start_time, end_time, purpose, status, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $2, NOW())
	`, b.ID, b.UserID, b.FacilityID, b.StartTime, b.EndTime, b.Purpose)
	return err
}

func FindByID(db *sql.DB, id string) (status string, ownerID string, err error) {
	err = db.QueryRow(`SELECT status, user_id FROM bookings WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&status, &ownerID)
	return
}

func UpdateStatus(db *sql.DB, bookingID string, status string, adminID string, ticketCode string) error {
	_, err := db.Exec(`
		UPDATE bookings SET status = $1, updated_at = NOW(), updated_by = $2, ticket_code = $4
		WHERE id = $3 AND deleted_at IS NULL
	`, status, adminID, bookingID, ticketCode)
	return err
}

func UpdateStatusCancel(db *sql.DB, bookingID string, userID string) error {
	_, err := db.Exec(`UPDATE bookings SET status = 'canceled', updated_at = NOW(), updated_by = $1 WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL`, userID, bookingID)
	return err
}

func FindByUserID(db *sql.DB, userID string) ([]BookingResponse, error) {
	// Query diperbarui dengan LEFT JOIN profiles untuk mengambil identitas
	rows, err := db.Query(`
        SELECT
            b.id, u.id, u.name, u.email,
            COALESCE(p.full_name, ''), COALESCE(p.identity_number, ''),
            b.facility_id, COALESCE(f.name, 'Unknown Facility'),
            b.start_time, b.end_time,
            CASE 
                WHEN b.status = 'approved' AND b.end_time < NOW() THEN 'completed'
                ELSE b.status::text 
            END,
            COALESCE(b.purpose, '-'), b.created_at,
            COALESCE(admin.name, '') AS admin_name,
            COALESCE(b.ticket_code, ''), b.is_checked_in, 
            b.is_checked_out, COALESCE(b.checkout_status, '')
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id -- JOIN ke tabel profil
        JOIN facilities f ON b.facility_id = f.id
        LEFT JOIN users admin ON b.updated_by = admin.id
        WHERE b.user_id = $1 AND b.deleted_at IS NULL
        ORDER BY b.created_at DESC
    `, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		// Scan harus sesuai urutan kolom SELECT di atas
		if err := rows.Scan(
			&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName, &b.User.Profile.IdentityNumber,
			&b.FacilityID, &b.FacilityName, &b.StartTime, &b.EndTime,
			&b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
			&b.TicketCode, &b.IsCheckedIn, &b.IsCheckedOut, &b.CheckoutStatus,
		); err != nil {
			return nil, err
		}
		// Sinkronisasi field UserID dan UserName agar tidak kosong
		b.UserID = b.User.ID
		b.UserName = b.User.Name
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func GetAll(db *sql.DB, statusFilter string) ([]BookingResponse, error) {
	rows, err := db.Query(`
		SELECT
			b.id, u.id, u.name, u.email,
			COALESCE(p.full_name, ''), COALESCE(p.phone_number, ''), COALESCE(p.address, ''), COALESCE(p.avatar_url, ''),
			COALESCE(p.gender, ''), COALESCE(p.identity_number, ''), COALESCE(p.department, ''), COALESCE(p.position, ''),
			b.facility_id, COALESCE(f.name, 'Unknown Facility'), b.start_time, b.end_time,
			CASE WHEN b.status = 'approved' AND b.end_time < NOW() THEN 'completed' ELSE b.status::text END,
			COALESCE(b.purpose, '-'), b.created_at, COALESCE(admin.name, '') AS admin_name,
			COALESCE(b.ticket_code, ''), b.is_checked_in, b.is_checked_out, COALESCE(b.checkout_status, '')
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.deleted_at IS NULL
		  AND ($1 = '' OR ($1 = 'completed' AND b.status = 'approved' AND b.end_time < NOW()) OR (b.status::text = $1 AND NOT (b.status = 'approved' AND b.end_time < NOW())))
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
			&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName, &b.User.Profile.PhoneNumber, &b.User.Profile.Address, &b.User.Profile.AvatarURL,
			&b.User.Profile.Gender, &b.User.Profile.IdentityNumber, &b.User.Profile.Department, &b.User.Profile.Position,
			&b.FacilityID, &b.FacilityName, &b.StartTime, &b.EndTime, &b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
			&b.TicketCode, &b.IsCheckedIn, &b.IsCheckedOut, &b.CheckoutStatus,
		); err != nil {
			return nil, err
		}
		b.UserID = b.User.ID
		b.UserName = b.User.Name
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func FindByTicketCode(db *sql.DB, code string) (*BookingResponse, error) {
	var b BookingResponse
	var checkedInAt, checkedOutAt sql.NullTime
	var ticketCode, checkoutStatus sql.NullString

	err := db.QueryRow(`
		SELECT 
			b.id, b.status, b.start_time, b.end_time, b.is_checked_in, b.checked_in_at, 
			b.is_checked_out, b.checked_out_at, b.checkout_status,
			u.name, f.name, b.ticket_code
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		WHERE b.ticket_code = $1 AND b.deleted_at IS NULL
	`, code).Scan(
		&b.ID, &b.Status, &b.StartTime, &b.EndTime, &b.IsCheckedIn, &checkedInAt,
		&b.IsCheckedOut, &checkedOutAt, &checkoutStatus,
		&b.UserName, &b.FacilityName, &ticketCode,
	)
	if err != nil {
		return nil, err
	}

	if checkedInAt.Valid {
		b.CheckedInAt = &checkedInAt.Time
	}
	if checkedOutAt.Valid {
		b.CheckedOutAt = &checkedOutAt.Time
	}
	if ticketCode.Valid {
		b.TicketCode = ticketCode.String
	}
	if checkoutStatus.Valid {
		b.CheckoutStatus = checkoutStatus.String
	}

	return &b, nil
}

func UpdateCheckIn(db *sql.DB, bookingID string) error {
	_, err := db.Exec(`UPDATE bookings SET is_checked_in = true, checked_in_at = NOW() WHERE id = $1`, bookingID)
	return err
}

// Fungsi Baru untuk Check-out
func UpdateCheckOut(db *sql.DB, bookingID string, status string) error {
	_, err := db.Exec(`
		UPDATE bookings 
		SET is_checked_out = true, 
		    checked_out_at = NOW(), 
		    checkout_status = $2 
		WHERE id = $1
	`, bookingID, status)
	return err
}

func GetConflictingBooking(db *sql.DB, facilityID string, start, end time.Time) (*time.Time, *time.Time, error) {
	var conflictStart, conflictEnd time.Time
	err := db.QueryRow(`
		SELECT start_time, end_time FROM bookings
		WHERE facility_id = $1 AND (status = 'approved' OR status = 'pending') 
		  AND deleted_at IS NULL AND ($2 < end_time AND $3 > start_time)
		LIMIT 1
	`, facilityID, start, end).Scan(&conflictStart, &conflictEnd)

	if err == sql.ErrNoRows {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return &conflictStart, &conflictEnd, nil
}
