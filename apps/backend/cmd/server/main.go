package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"

	// Import Library Swagger
	_ "campus-reservation-backend/docs"

	"github.com/gofiber/swagger"

	"campus-reservation-backend/internal/auth"
	"campus-reservation-backend/internal/booking"
	"campus-reservation-backend/internal/dashboard"
	"campus-reservation-backend/internal/database"
	"campus-reservation-backend/internal/facility"
	"campus-reservation-backend/internal/profile"
	"campus-reservation-backend/internal/user"
)

// @title           Campus Reservation API
// @version         1.0
// @description     Dokumentasi API untuk Sistem Reservasi Kampus (UniSpace).
// @termsOfService  http://swagger.io/terms/

// @contact.name    Tim Developer
// @contact.email   support@unu.ac.id

// @host            localhost:3000
// @BasePath        /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Masukkan token dengan format "Bearer <token_anda>"
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
	// 3.2. SETUP SWAGGER (BARU)
	// ==========================
	app.Get("/swagger/*", swagger.HandlerDefault)

	// ==========================
	// 3.3. SETUP STATIC FOLDER
	// ==========================
	app.Static("/uploads", "./uploads")

	// ==========================
	// 4. PUBLIC ROUTES
	// ==========================
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Backend Campus Reservation System is Running...")
	})

	// AUTH STANDARD (EMAIL & PASS)
	app.Post("/auth/register", auth.RegisterHandler(db))
	app.Post("/auth/login", auth.LoginHandler(db))

	// AUTH OTP (WHATSAPP)
	app.Post("/auth/login/request-otp", auth.RequestLoginOTPHandler(db))
	app.Post("/auth/login/verify-otp", auth.VerifyLoginOTPHandler(db))
	app.Post("/auth/register/request-otp", auth.RequestRegisterOTPHandler(db))
	app.Post("/auth/register/verify-otp", auth.VerifyRegisterOTPHandler(db))

	// ==========================
	// 5. PROTECTED ROUTES (JWT)
	// ==========================

	// Endpoint /me (Profile)
	app.Get("/me", auth.JWTProtected(), func(c *fiber.Ctx) error {
		userVal := c.Locals("user_id")

		if userVal == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Token valid tapi user_id tidak ditemukan"})
		}

		userID, ok := userVal.(string)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"error": "Format user_id salah"})
		}

		userData, err := user.FindByID(db, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}

		avatarURL := ""
		profileData, err := profile.GetByUserID(db, userID)
		if err == nil && profileData != nil {
			avatarURL = profileData.AvatarURL
		}

		return c.JSON(fiber.Map{
			"id":         userData.ID,
			"name":       userData.Name,
			"email":      userData.Email,
			"role":       userData.Role,
			"avatar_url": avatarURL,
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
	app.Post("/bookings/:id/review", auth.JWTProtected(), auth.RequireRole("user"), booking.SubmitReviewHandler(db))

	// Admin Routes for Bookings
	app.Get("/bookings", auth.JWTProtected(), auth.RequireRole("admin"), booking.ListAllHandler(db))
	app.Patch("/bookings/:id/status", auth.JWTProtected(), auth.RequireRole("admin"), booking.UpdateStatusHandler(db))
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
	app.Post("/profile/avatar", auth.JWTProtected(), profile.UploadAvatarHandler)

	// ==========================
	// 11. WORKER: AUTO CHECK-OUT
	// ==========================
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
