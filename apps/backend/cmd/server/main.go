package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"campus-reservation-backend/internal/auth"
	"campus-reservation-backend/internal/booking"
	"campus-reservation-backend/internal/database"
	"campus-reservation-backend/internal/facility"
)

func main() {
	// ==========================
	// 1. LOAD ENVIRONMENT
	// ==========================
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file tidak ditemukan")
	}

	// ==========================
	// 2. CONNECT DATABASE
	// ==========================
	db := database.Connect()
	defer db.Close()

	// ==========================
	// 3. INIT FIBER APP
	// ==========================
	app := fiber.New()

	// ==========================
	// 4. PUBLIC ROUTES (NO AUTH)
	// ==========================
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Backend Campus Reservation System jalan")
	})

	app.Post("/auth/register", auth.RegisterHandler(db))
	app.Post("/auth/login", auth.LoginHandler(db))

	// ==========================
	// 5. PROTECTED ROUTES (JWT)
	// ==========================
	app.Get(
		"/me",
		auth.JWTProtected(),
		func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{
				"user_id": c.Locals("user_id"),
				"role":    c.Locals("role"),
			})
		},
	)

	// ==========================
	// 6. FACILITY ROUTES
	// ==========================

	// CREATE FASILITAS (ADMIN ONLY)
	app.Post(
		"/facilities",
		auth.JWTProtected(),
		auth.RequireRole("admin"),
		facility.CreateHandler(db),
	)

	// LIST FASILITAS (USER & ADMIN)
	app.Get(
		"/facilities",
		auth.JWTProtected(),
		facility.ListHandler(db),
	)

	// UPDATE FASILITAS (ADMIN ONLY)
	app.Put(
		"/facilities/:id",
		auth.JWTProtected(),
		auth.RequireRole("admin"),
		facility.UpdateHandler(db),
	)

	// NONAKTIFKAN FASILITAS (ADMIN ONLY)
	app.Delete(
		"/facilities/:id",
		auth.JWTProtected(),
		auth.RequireRole("admin"),
		facility.DeactivateHandler(db),
	)

	// ==========================
	// BOOKING ROUTES
	// ==========================

	// USER: CREATE BOOKING
	app.Post(
		"/bookings",
		auth.JWTProtected(),
		auth.RequireRole("user"),
		booking.CreateHandler(db),
	)

	// USER: LIST OWN BOOKINGS
	app.Get(
		"/bookings/me",
		auth.JWTProtected(),
		auth.RequireRole("user"),
		booking.MyBookingsHandler(db),
	)

	// USER: CANCEL BOOKING (PENDING ONLY)
	app.Delete(
		"/bookings/:id",
		auth.JWTProtected(),
		auth.RequireRole("user"),
		booking.CancelHandler(db),
	)

	// ADMIN: APPROVE / REJECT BOOKING
	app.Patch(
		"/bookings/:id/status",
		auth.JWTProtected(),
		auth.RequireRole("admin"),
		booking.UpdateStatusHandler(db),
	)

	// ==========================
	// 7. START SERVER
	// ==========================
	log.Println("Server running on port 3000")
	log.Fatal(app.Listen(":3000"))
}
