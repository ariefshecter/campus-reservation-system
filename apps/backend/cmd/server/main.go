package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"

	"campus-reservation-backend/internal/auth"
	"campus-reservation-backend/internal/booking"
	"campus-reservation-backend/internal/dashboard"
	"campus-reservation-backend/internal/database"
	"campus-reservation-backend/internal/facility"
	"campus-reservation-backend/internal/profile"
	"campus-reservation-backend/internal/user"
)

func main() {
	// ==========================
	// 1. LOAD ENVIRONMENT
	// ==========================
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file tidak ditemukan, menggunakan environment variables sistem")
	}

	// ==========================
	// 2. CONNECT DATABASE
	// ==========================
	db := database.Connect()
	defer db.Close()

	// ==========================
	// 3. INIT FIBER APP
	// ==========================
	app := fiber.New(fiber.Config{
		BodyLimit: 10 * 1024 * 1024, // Limit Upload 10MB
	})

	// ==========================
	// 3.1. SETUP CORS
	// ==========================
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3001, http://localhost:3000",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, HEAD, PUT, DELETE, PATCH",
	}))

	// ==========================
	// 3.2. SETUP STATIC FOLDER
	// ==========================
	// Agar URL seperti http://localhost:3000/uploads/foto.jpg bisa dibuka
	app.Static("/uploads", "./uploads")

	// ==========================
	// 4. PUBLIC ROUTES
	// ==========================
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Backend Campus Reservation System is Running...")
	})

	app.Post("/auth/register", auth.RegisterHandler(db))
	app.Post("/auth/login", auth.LoginHandler(db))

	// ==========================
	// 5. PROTECTED ROUTES (JWT)
	// ==========================

	// [DIPERBARUI] Endpoint /me sekarang mengambil avatar dari Profile
	app.Get("/me", auth.JWTProtected(), func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		// 1. Ambil data akun utama (email, role, nama user)
		userData, err := user.FindByID(db, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		// 2. Ambil data profile (untuk dapat avatar_url)
		// Kita gunakan variabel temporary untuk avatar
		avatarURL := ""
		profileData, err := profile.GetByUserID(db, userID)
		if err == nil && profileData != nil {
			avatarURL = profileData.AvatarURL
		}

		// 3. Return gabungan data User + Avatar
		return c.JSON(fiber.Map{
			"id":         userData.ID,
			"name":       userData.Name,
			"email":      userData.Email,
			"role":       userData.Role,
			"avatar_url": avatarURL, // <--- Ini yang dicari frontend!
		})
	})

	// Change Password
	app.Post("/users/change-password", auth.JWTProtected(), user.ChangePasswordHandler(db))

	// ==========================
	// 6. FACILITY ROUTES
	// ==========================
	app.Post("/facilities", auth.JWTProtected(), auth.RequireRole("admin"), facility.CreateHandler(db))
	app.Put("/facilities/:id", auth.JWTProtected(), auth.RequireRole("admin"), facility.UpdateHandler(db))
	app.Patch("/facilities/:id/status", auth.JWTProtected(), auth.RequireRole("admin"), facility.ToggleStatusHandler(db))
	app.Delete("/facilities/:id", auth.JWTProtected(), auth.RequireRole("admin"), facility.DeleteHandler(db))
	app.Get("/facilities", auth.JWTProtected(), facility.ListHandler(db))
	app.Get("/facilities/:id", auth.JWTProtected(), facility.GetOneHandler(db))

	// ==========================
	// 7. BOOKING ROUTES
	// ==========================
	app.Post("/bookings", auth.JWTProtected(), auth.RequireRole("user"), booking.CreateHandler(db))
	app.Delete("/bookings/:id", auth.JWTProtected(), auth.RequireRole("user"), booking.CancelHandler(db))
	app.Get("/bookings/:id/ticket", auth.JWTProtected(), booking.DownloadTicketHandler(db))
	app.Get("/facilities/:id/schedule", auth.JWTProtected(), booking.GetFacilityScheduleHandler(db))
	app.Get("/bookings/me", auth.JWTProtected(), auth.RequireRole("user"), booking.MyBookingsHandler(db))

	// [BARU] Route User - Submit Review (User Only)
	app.Post("/bookings/:id/review", auth.JWTProtected(), auth.RequireRole("user"), booking.SubmitReviewHandler(db))

	// Admin Routes for Bookings
	app.Get("/bookings", auth.JWTProtected(), auth.RequireRole("admin"), booking.ListAllHandler(db))
	app.Patch("/bookings/:id/status", auth.JWTProtected(), auth.RequireRole("admin"), booking.UpdateStatusHandler(db))

	// [BARU] Route Admin - List Reviews (Admin Only)
	app.Get("/admin/reviews", auth.JWTProtected(), auth.RequireRole("admin"), booking.GetAdminReviewsHandler(db))

	app.Post("/bookings/verify-ticket", auth.JWTProtected(), auth.RequireRole("admin"), booking.CheckInHandler(db))
	app.Get("/admin/attendance", auth.JWTProtected(), auth.RequireRole("admin"), booking.GetAttendanceLogsHandler(db))
	app.Get("/admin/attendance/export", auth.JWTProtected(), auth.RequireRole("admin"), booking.ExportAttendanceHandler(db))

	// ==========================
	// 8. USER ROUTES (ADMIN)
	// ==========================
	app.Get("/users", auth.JWTProtected(), auth.RequireRole("admin"), user.ListHandler(db))
	app.Get("/users/:id", auth.JWTProtected(), auth.RequireRole("admin"), user.GetOneHandler(db))
	app.Patch("/users/:id/role", auth.JWTProtected(), auth.RequireRole("admin"), user.UpdateRoleHandler(db))
	app.Delete("/users/:id", auth.JWTProtected(), auth.RequireRole("admin"), user.DeleteUserHandler(db))

	// ==========================
	// 9. DASHBOARD STATS (ADMIN)
	// ==========================
	app.Get("/dashboard/stats", auth.JWTProtected(), auth.RequireRole("admin"), dashboard.DashboardHandler(db))

	// ==========================
	// 10. PROFILE ROUTES
	// ==========================
	app.Get("/profile", auth.JWTProtected(), profile.GetHandler(db))
	app.Put("/profile", auth.JWTProtected(), profile.UpdateHandler(db))

	// Upload Avatar
	app.Post("/profile/avatar", auth.JWTProtected(), profile.UploadAvatarHandler)

	// ==========================
	// 11. WORKER: AUTO CHECK-OUT
	// ==========================
	// Menjalankan pengecekan otomatis setiap 1 menit di background
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		log.Println("Worker Auto-Checkout Started...")

		for range ticker.C {
			if err := booking.RunAutoCheckout(db); err != nil {
				log.Printf("Error running auto checkout: %v\n", err)
			}
		}
	}()

	// ==========================
	// RUN SERVER
	// ==========================
	log.Println("Server running on port 3000")
	log.Fatal(app.Listen(":3000"))
}
