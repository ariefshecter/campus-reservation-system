package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"

	"campus-reservation-backend/internal/auth"
	"campus-reservation-backend/internal/booking"
	"campus-reservation-backend/internal/dashboard"
	"campus-reservation-backend/internal/database"
	"campus-reservation-backend/internal/facility"
	"campus-reservation-backend/internal/profile" // <-- Modul Profile
	"campus-reservation-backend/internal/user"
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
	// 3.1. SETUP CORS
	// ==========================
	// Mengizinkan Frontend (localhost:3001) mengakses Backend
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3001",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, HEAD, PUT, DELETE, PATCH",
	}))

	// ==========================
	// 3.2. SETUP STATIC FOLDER (Uploads)
	// ==========================
	// Agar gambar fasilitas bisa diakses via browser
	app.Static("/uploads", "./uploads")

	// ==========================
	// 4. PUBLIC ROUTES
	// ==========================
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Backend Campus Reservation System jalan")
	})

	app.Post("/auth/register", auth.RegisterHandler(db))
	app.Post("/auth/login", auth.LoginHandler(db))

	// ==========================
	// 5. PROTECTED ROUTES (JWT)
	// ==========================
	// Middleware auth.JWTProtected() memastikan user sudah login

	// CEK USER LOGIN SAAT INI
	app.Get("/me", auth.JWTProtected(), func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		// Ambil data user dari tabel users (email, role, name)
		userData, err := user.FindByID(db, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		return c.JSON(userData)
	})

	// ==========================
	// 6. FACILITY ROUTES
	// ==========================

	// CREATE (ADMIN Only)
	app.Post("/facilities", auth.JWTProtected(), auth.RequireRole("admin"), facility.CreateHandler(db))

	// READ (PUBLIC/USER - Semua user login bisa lihat)
	app.Get("/facilities", auth.JWTProtected(), facility.ListHandler(db))

	// UPDATE FULL / EDIT (ADMIN Only)
	app.Put("/facilities/:id", auth.JWTProtected(), auth.RequireRole("admin"), facility.UpdateHandler(db))

	// TOGGLE STATUS (ADMIN Only - Aktif/Nonaktif)
	app.Patch("/facilities/:id/status", auth.JWTProtected(), auth.RequireRole("admin"), facility.ToggleStatusHandler(db))

	// DELETE PERMANEN (ADMIN Only)
	app.Delete("/facilities/:id", auth.JWTProtected(), auth.RequireRole("admin"), facility.DeleteHandler(db))

	// ==========================
	// 7. BOOKING ROUTES
	// ==========================

	// Create Booking (User Only)
	app.Post("/bookings", auth.JWTProtected(), auth.RequireRole("user"), booking.CreateHandler(db))

	// List All Bookings (Admin Only - dengan filter status)
	app.Get("/bookings", auth.JWTProtected(), auth.RequireRole("admin"), booking.ListAllHandler(db))

	// My Bookings (User Only - lihat history sendiri)
	app.Get("/bookings/me", auth.JWTProtected(), auth.RequireRole("user"), booking.MyBookingsHandler(db))

	// Cancel Booking (User Only - batalkan request sendiri)
	app.Delete("/bookings/:id", auth.JWTProtected(), auth.RequireRole("user"), booking.CancelHandler(db))

	// Approve/Reject Booking (Admin Only)
	app.Patch("/bookings/:id/status", auth.JWTProtected(), auth.RequireRole("admin"), booking.UpdateStatusHandler(db))

	// ==========================
	// 8. USER ROUTES (ADMIN ONLY)
	// ==========================
	// Manajemen User oleh Admin
	app.Get("/users", auth.JWTProtected(), auth.RequireRole("admin"), user.ListHandler(db))
	app.Patch("/users/:id/role", auth.JWTProtected(), auth.RequireRole("admin"), user.UpdateRoleHandler(db))
	app.Delete("/users/:id", auth.JWTProtected(), auth.RequireRole("admin"), user.DeleteUserHandler(db))

	// ==========================
	// 9. DASHBOARD STATS (ADMIN ONLY)
	// ==========================
	// Statistik untuk halaman dashboard admin
	app.Get("/dashboard/stats", auth.JWTProtected(), auth.RequireRole("admin"), dashboard.DashboardHandler(db))

	// ==========================
	// 10. PROFILE ROUTES (USER & ADMIN)
	// ==========================
	// Mengelola data detail user (NIM, No HP, Jurusan, dll)
	app.Get("/profile", auth.JWTProtected(), profile.GetHandler(db))
	app.Put("/profile", auth.JWTProtected(), profile.UpdateHandler(db))

	// ==========================
	// RUN SERVER
	// ==========================
	log.Println("Server running on port 3000")
	log.Fatal(app.Listen(":3000"))
}
