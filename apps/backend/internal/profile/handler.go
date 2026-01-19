package profile

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// REQUEST DTO
// ==========================
type UpdateProfileRequest struct {
	FullName       string `json:"full_name"`
	PhoneNumber    string `json:"phone_number"`
	Address        string `json:"address"`
	AvatarURL      string `json:"avatar_url"`
	Gender         string `json:"gender"`
	IdentityNumber string `json:"identity_number"`
	Department     string `json:"department"`
	Position       string `json:"position"`
}

// ==========================
// GET PROFILE
// ==========================
func GetHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Ambil user_id dari JWT middleware
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "unauthorized"})
		}

		profile, err := GetByUserID(db, userID)
		if err != nil {
			// Profil belum ada = return object kosong (bukan error fatal)
			return c.JSON(fiber.Map{
				"user_id": userID,
			})
		}

		return c.JSON(profile)
	}
}

// ==========================
// UPSERT PROFILE (CREATE / UPDATE)
// ==========================
func UpdateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "unauthorized"})
		}

		var req UpdateProfileRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).
				JSON(fiber.Map{"error": "invalid request body"})
		}

		profile := Profile{
			UserID:         userID,
			FullName:       req.FullName,
			PhoneNumber:    req.PhoneNumber,
			Address:        req.Address,
			AvatarURL:      req.AvatarURL,
			Gender:         req.Gender,
			IdentityNumber: req.IdentityNumber,
			Department:     req.Department,
			Position:       req.Position,
		}

		if err := Upsert(db, userID, profile); err != nil {
			return c.Status(500).
				JSON(fiber.Map{"error": "gagal menyimpan profil"})
		}

		return c.JSON(fiber.Map{
			"message": "profil berhasil disimpan",
		})
	}
}
