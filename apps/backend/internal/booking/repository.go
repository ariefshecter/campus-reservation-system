package booking

import (
	"database/sql"
	"fmt"
	"time"
)

// ========================================================
// ENTITY / DTO
// ========================================================

type Booking struct {
	ID             string         `json:"id"`
	UserID         string         `json:"user_id"`
	FacilityID     string         `json:"facility_id"`
	StartTime      time.Time      `json:"start_time"`
	EndTime        time.Time      `json:"end_time"`
	Status         string         `json:"status"`
	Purpose        string         `json:"purpose"`
	CreatedAt      time.Time      `json:"created_at"`
	TicketCode     sql.NullString `json:"ticket_code"`
	IsCheckedIn    bool           `json:"is_checked_in"`
	CheckedInAt    sql.NullTime   `json:"checked_in_at"`
	IsCheckedOut   bool           `json:"is_checked_out"`
	CheckedOutAt   sql.NullTime   `json:"checked_out_at"`
	CheckoutStatus sql.NullString `json:"checkout_status"`
	// Field baru untuk sinkronisasi DB
	ActualEndTime    sql.NullTime   `json:"actual_end_time"`
	AttendanceStatus sql.NullString `json:"attendance_status"`
	// Field baru untuk fitur ulasan
	ReviewComment sql.NullString `json:"review_comment"`
	ReviewedAt    sql.NullTime   `json:"reviewed_at"`
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
	ID             string      `json:"id"`
	UserID         string      `json:"user_id"`
	UserName       string      `json:"user_name"`
	User           BookingUser `json:"user"`
	FacilityID     string      `json:"facility_id"`
	FacilityName   string      `json:"facility_name"`
	StartTime      time.Time   `json:"start_time"`
	EndTime        time.Time   `json:"end_time"`
	Status         string      `json:"status"`
	Purpose        string      `json:"purpose"`
	CreatedAt      time.Time   `json:"created_at"`
	AdminName      string      `json:"admin_name"`
	TicketCode     string      `json:"ticket_code,omitempty"`
	IsCheckedIn    bool        `json:"is_checked_in"`
	CheckedInAt    *time.Time  `json:"checked_in_at,omitempty"`
	IsCheckedOut   bool        `json:"is_checked_out"`
	CheckedOutAt   *time.Time  `json:"checked_out_at,omitempty"`
	CheckoutStatus string      `json:"checkout_status,omitempty"`
	// Response field baru
	ActualEndTime    *time.Time `json:"actual_end_time,omitempty"`
	AttendanceStatus string     `json:"attendance_status,omitempty"`
	RejectionReason  string     `json:"rejection_reason,omitempty"`
	// Response field baru untuk ulasan
	ReviewComment string     `json:"review_comment,omitempty"`
	ReviewedAt    *time.Time `json:"reviewed_at,omitempty"`
}

// Struct khusus untuk respon jadwal publik/user
type ScheduleResponse struct {
	ID               string     `json:"id"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          time.Time  `json:"end_time"`
	ActualEndTime    *time.Time `json:"actual_end_time,omitempty"`
	Status           string     `json:"status"`
	AttendanceStatus string     `json:"attendance_status,omitempty"`
	UserName         string     `json:"user_name"`
}

// ========================================================
// REPOSITORY FUNCTIONS
// ========================================================

// Fungsi untuk mengambil jadwal berdasarkan Facility ID (Aman untuk publik)
func GetScheduleByFacility(db *sql.DB, facilityID string) ([]ScheduleResponse, error) {
	rows, err := db.Query(`
		SELECT 
			b.id, b.start_time, b.end_time, b.actual_end_time, 
			b.status::text, COALESCE(b.attendance_status, ''), u.name
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		WHERE b.facility_id = $1 
		  AND b.deleted_at IS NULL
		  AND b.status IN ('approved', 'completed', 'pending')
		  AND b.start_time >= (NOW() - INTERVAL '2 days')
		ORDER BY b.start_time ASC
	`, facilityID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []ScheduleResponse
	for rows.Next() {
		var s ScheduleResponse
		var actualEndTime sql.NullTime
		if err := rows.Scan(
			&s.ID, &s.StartTime, &s.EndTime, &actualEndTime,
			&s.Status, &s.AttendanceStatus, &s.UserName,
		); err != nil {
			return nil, err
		}
		if actualEndTime.Valid {
			s.ActualEndTime = &actualEndTime.Time
		}
		schedules = append(schedules, s)
	}
	return schedules, nil
}

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

func FindDetailByID(db *sql.DB, bookingID string) (*BookingResponse, error) {
	var b BookingResponse
	var actualEndTime sql.NullTime
	var ticketCode sql.NullString

	err := db.QueryRow(`
		SELECT 
			b.id, b.user_id, u.name, u.email,
			COALESCE(p.full_name, ''), COALESCE(p.identity_number, ''),
			b.facility_id, f.name, 
			b.start_time, b.end_time, b.status, 
			b.ticket_code, b.actual_end_time
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		JOIN facilities f ON b.facility_id = f.id
		WHERE b.id = $1 AND b.deleted_at IS NULL
	`, bookingID).Scan(
		&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
		&b.User.Profile.FullName, &b.User.Profile.IdentityNumber,
		&b.FacilityID, &b.FacilityName,
		&b.StartTime, &b.EndTime, &b.Status,
		&ticketCode, &actualEndTime,
	)

	if err != nil {
		return nil, err
	}

	if ticketCode.Valid {
		b.TicketCode = ticketCode.String
	}
	if b.User.Profile.FullName != "" {
		b.UserName = b.User.Profile.FullName
	} else {
		b.UserName = b.User.Name
	}

	return &b, nil
}

func UpdateStatus(db *sql.DB, bookingID string, status string, rejectionReason string, adminID string, ticketCode string) error {
	var ticketCodeVal interface{} = ticketCode
	if ticketCode == "" {
		ticketCodeVal = nil
	}

	var reasonVal interface{} = rejectionReason
	if rejectionReason == "" {
		reasonVal = nil
	}

	_, err := db.Exec(`
		UPDATE bookings 
		SET status = $1, 
			rejection_reason = $2, 
			updated_at = NOW(), 
			updated_by = $3, 
			ticket_code = $4
		WHERE id = $5 AND deleted_at IS NULL
	`, status, reasonVal, adminID, ticketCodeVal, bookingID)
	return err
}

func UpdateStatusCancel(db *sql.DB, bookingID string, userID string) error {
	_, err := db.Exec(`UPDATE bookings SET status = 'canceled', updated_at = NOW(), updated_by = $1 WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL`, userID, bookingID)
	return err
}

// UpdateReview menyimpan atau memperbarui ulasan dari user
func UpdateReview(db *sql.DB, bookingID string, userID string, comment string) error {
	_, err := db.Exec(`
        UPDATE bookings 
        SET review_comment = $1, 
            reviewed_at = NOW() 
        WHERE id = $2 AND user_id = $3 AND status = 'completed'
    `, comment, bookingID, userID)
	return err
}

// [PERBAIKAN] Menambahkan kolom review_comment dan reviewed_at pada SELECT
func FindByUserID(db *sql.DB, userID string) ([]BookingResponse, error) {
	rows, err := db.Query(`
		SELECT
			b.id, u.id, u.name, u.email,
			COALESCE(p.full_name, ''), COALESCE(p.identity_number, ''),
			b.facility_id, COALESCE(f.name, 'Unknown Facility'),
			b.start_time, b.end_time, b.status::text,
			COALESCE(b.purpose, '-'), b.created_at,
			COALESCE(admin.name, '') AS admin_name,
			COALESCE(b.ticket_code, ''), b.is_checked_in, 
			b.is_checked_out, COALESCE(b.attendance_status, ''),
			COALESCE(b.rejection_reason, ''),
			COALESCE(b.review_comment, ''), -- [FIX] Tambahkan ini
			b.reviewed_at                   -- [FIX] Tambahkan ini
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.user_id = $1 AND b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanBookings(rows)
}

// [PERBAIKAN] Menambahkan kolom review_comment dan reviewed_at pada SELECT
func GetAll(db *sql.DB, statusFilter, facilityID, userID string) ([]BookingResponse, error) {
	query := `
		SELECT
			b.id, u.id, u.name, u.email,
			COALESCE(p.full_name, ''), COALESCE(p.phone_number, ''), COALESCE(p.address, ''), COALESCE(p.avatar_url, ''),
			COALESCE(p.gender, ''), COALESCE(p.identity_number, ''), COALESCE(p.department, ''), COALESCE(p.position, ''),
			b.facility_id, COALESCE(f.name, 'Unknown Facility'), b.start_time, b.end_time,
			b.status::text, COALESCE(b.purpose, '-'), b.created_at, COALESCE(admin.name, '') AS admin_name,
			COALESCE(b.ticket_code, ''), b.is_checked_in, b.is_checked_out, COALESCE(b.attendance_status, ''),
			b.actual_end_time,
			COALESCE(b.rejection_reason, ''),
			COALESCE(b.review_comment, ''), -- [FIX] Tambahkan ini
			b.reviewed_at                   -- [FIX] Tambahkan ini
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.deleted_at IS NULL
	`

	var args []interface{}
	argCounter := 1

	if statusFilter != "" {
		query += fmt.Sprintf(" AND b.status::text = $%d", argCounter)
		args = append(args, statusFilter)
		argCounter++
	}

	if facilityID != "" {
		query += fmt.Sprintf(" AND b.facility_id = $%d", argCounter)
		args = append(args, facilityID)
		argCounter++
	}

	if userID != "" {
		query += fmt.Sprintf(" AND b.user_id = $%d", argCounter)
		args = append(args, userID)
		argCounter++
	}

	query += " ORDER BY b.start_time DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		var reviewedAt sql.NullTime // Variabel lokal untuk scan

		if err := rows.Scan(
			&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName, &b.User.Profile.PhoneNumber, &b.User.Profile.Address, &b.User.Profile.AvatarURL,
			&b.User.Profile.Gender, &b.User.Profile.IdentityNumber, &b.User.Profile.Department, &b.User.Profile.Position,
			&b.FacilityID, &b.FacilityName, &b.StartTime, &b.EndTime, &b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
			&b.TicketCode, &b.IsCheckedIn, &b.IsCheckedOut, &b.AttendanceStatus, &b.ActualEndTime,
			&b.RejectionReason,
			&b.ReviewComment, // [FIX] Scan field baru
			&reviewedAt,      // [FIX] Scan field baru
		); err != nil {
			return nil, err
		}

		if reviewedAt.Valid {
			b.ReviewedAt = &reviewedAt.Time
		}

		b.UserID = b.User.ID
		b.UserName = b.User.Name
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func FindByTicketCode(db *sql.DB, code string) (*BookingResponse, error) {
	var b BookingResponse
	var checkedInAt, checkedOutAt, actualEndTime sql.NullTime
	var ticketCode, attendanceStatus sql.NullString

	err := db.QueryRow(`
		SELECT 
			b.id, b.status, b.start_time, b.end_time, b.is_checked_in, b.checked_in_at, 
			b.is_checked_out, b.checked_out_at, b.attendance_status,
			u.name, f.name, b.ticket_code, b.actual_end_time
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		JOIN facilities f ON b.facility_id = f.id
		WHERE b.ticket_code = $1 AND b.deleted_at IS NULL
	`, code).Scan(
		&b.ID, &b.Status, &b.StartTime, &b.EndTime, &b.IsCheckedIn, &checkedInAt,
		&b.IsCheckedOut, &checkedOutAt, &attendanceStatus,
		&b.UserName, &b.FacilityName, &ticketCode, &actualEndTime,
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
	if actualEndTime.Valid {
		b.ActualEndTime = &actualEndTime.Time
	}
	if ticketCode.Valid {
		b.TicketCode = ticketCode.String
	}
	if attendanceStatus.Valid {
		b.AttendanceStatus = attendanceStatus.String
	}

	return &b, nil
}

func UpdateCheckIn(db *sql.DB, bookingID string) error {
	_, err := db.Exec(`UPDATE bookings SET is_checked_in = true, checked_in_at = NOW() WHERE id = $1`, bookingID)
	return err
}

func UpdateCheckOut(db *sql.DB, bookingID string, attendanceStatus string) error {
	_, err := db.Exec(`
		UPDATE bookings 
		SET is_checked_out = true, 
			checked_out_at = NOW(), 
			actual_end_time = NOW(),
			attendance_status = $2,
			status = 'completed'
		WHERE id = $1
	`, bookingID, attendanceStatus)
	return err
}

func GetConflictingBooking(db *sql.DB, facilityID string, start, end time.Time) (*time.Time, *time.Time, error) {
	var conflictStart, conflictEnd time.Time
	err := db.QueryRow(`
		SELECT start_time, COALESCE(actual_end_time, end_time) 
		FROM bookings
		WHERE facility_id = $1 
		  AND (status = 'approved' OR status = 'pending') 
		  AND deleted_at IS NULL 
		  AND ($2 < COALESCE(actual_end_time, end_time) AND $3 > start_time)
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

func ProcessExpiredBookings(db *sql.DB) error {
	_, err := db.Exec(`
		UPDATE bookings 
		SET status = 'completed', 
			attendance_status = 'no_show',
			actual_end_time = end_time
		WHERE status = 'approved' 
		  AND is_checked_in = false 
		  AND end_time < NOW()
		  AND deleted_at IS NULL
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		UPDATE bookings 
		SET status = 'completed', 
			is_checked_out = true,
			checked_out_at = NOW(),
			attendance_status = 'late',
			actual_end_time = NOW()
		WHERE status = 'approved' 
		  AND is_checked_in = true 
		  AND is_checked_out = false
		  AND end_time < NOW()
		  AND deleted_at IS NULL
	`)
	return err
}

// [PERBAIKAN] Helper function untuk scan rows, sekarang sinkron dengan SELECT
func scanBookings(rows *sql.Rows) ([]BookingResponse, error) {
	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		var reviewedAt sql.NullTime // Variabel lokal untuk scan

		if err := rows.Scan(
			&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName, &b.User.Profile.IdentityNumber,
			&b.FacilityID, &b.FacilityName, &b.StartTime, &b.EndTime,
			&b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
			&b.TicketCode, &b.IsCheckedIn, &b.IsCheckedOut, &b.AttendanceStatus,
			&b.RejectionReason,
			&b.ReviewComment, // [FIX] Field ini sekarang diambil dari SELECT
			&reviewedAt,      // [FIX] Field ini sekarang diambil dari SELECT
		); err != nil {
			return nil, err
		}

		if reviewedAt.Valid {
			b.ReviewedAt = &reviewedAt.Time
		}

		b.UserID = b.User.ID
		b.UserName = b.User.Name
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func GetAttendanceLogs(db *sql.DB, startDate, endDate, status string) ([]BookingResponse, error) {
	if startDate == "" {
		startDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02")
	}

	startQuery := startDate + " 00:00:00"
	endQuery := endDate + " 23:59:59"

	query := `
		SELECT
			b.id, u.id, u.name, u.email,
			COALESCE(p.full_name, ''), COALESCE(p.identity_number, ''),
			b.facility_id, COALESCE(f.name, 'Unknown Facility'),
			b.start_time, b.end_time,
			b.status::text, COALESCE(b.purpose, '-'), b.created_at,
			COALESCE(admin.name, '') AS admin_name,
			COALESCE(b.ticket_code, ''), b.is_checked_in, 
			b.checked_in_at, 
			b.is_checked_out, 
			b.checked_out_at, 
			COALESCE(b.attendance_status, ''),
			b.actual_end_time
		FROM bookings b
		JOIN users u ON b.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		JOIN facilities f ON b.facility_id = f.id
		LEFT JOIN users admin ON b.updated_by = admin.id
		WHERE b.deleted_at IS NULL
		  AND b.status IN ('approved', 'completed')
		  AND b.start_time BETWEEN $1 AND $2
	`

	var args []interface{}
	args = append(args, startQuery, endQuery)

	if status != "" && status != "all" {
		query += " AND b.attendance_status = $3"
		args = append(args, status)
	}

	query += " ORDER BY b.start_time DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []BookingResponse
	for rows.Next() {
		var b BookingResponse
		var checkedInAt, checkedOutAt sql.NullTime

		if err := rows.Scan(
			&b.ID, &b.User.ID, &b.User.Name, &b.User.Email,
			&b.User.Profile.FullName, &b.User.Profile.IdentityNumber,
			&b.FacilityID, &b.FacilityName, &b.StartTime, &b.EndTime,
			&b.Status, &b.Purpose, &b.CreatedAt, &b.AdminName,
			&b.TicketCode, &b.IsCheckedIn,
			&checkedInAt,
			&b.IsCheckedOut,
			&checkedOutAt,
			&b.AttendanceStatus, &b.ActualEndTime,
		); err != nil {
			return nil, err
		}

		if checkedInAt.Valid {
			b.CheckedInAt = &checkedInAt.Time
		}
		if checkedOutAt.Valid {
			b.CheckedOutAt = &checkedOutAt.Time
		}

		if b.User.Profile.FullName != "" {
			b.UserName = b.User.Profile.FullName
		} else {
			b.UserName = b.User.Name
		}

		bookings = append(bookings, b)
	}
	return bookings, nil
}
