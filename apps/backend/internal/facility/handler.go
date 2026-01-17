package facility

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ==========================
// CREATE FASILITAS
// ==========================
func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		// 1. Ambil Data Form
		name := c.FormValue("name")
		description := c.FormValue("description")
		location := c.FormValue("location")

		// Konversi String ke Angka (Karena FormData selalu string)
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		// 2. Handle Upload Foto
		var photoURL string
		file, err := c.FormFile("photo")

		if err == nil {
			// Buat nama file unik: timestamp-namafile
			filename := fmt.Sprintf("%d-%s", time.Now().Unix(), file.Filename)

			// Simpan ke folder uploads
			savePath := filepath.Join("./uploads", filename)
			if err := c.SaveFile(file, savePath); err == nil {
				// Set URL
				photoURL = fmt.Sprintf("http://localhost:3000/uploads/%s", filename)
			}
		}

		// 3. Simpan ke DB
		f := Facility{
			Name:        name,
			Description: description,
			Location:    location,
			Capacity:    capacity,
			Price:       price,
			PhotoURL:    photoURL,
		}

		if err := CreateFacility(db, f, userID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.Status(201).JSON(fiber.Map{"message": "Fasilitas berhasil dibuat"})
	}
}

// ==========================
// LIST FASILITAS (ADMIN & USER)
// ==========================
func ListHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Menggunakan repository FindAll yang baru
		data, err := FindAll(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal ambil data"})
		}
		return c.JSON(data)
	}
}

// ==========================
// UPDATE FASILITAS (EDIT FULL)
// ==========================
func UpdateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		userID := c.Locals("user_id").(string)

		// 1. Ambil data lama dulu (untuk cek foto lama)
		oldData, err := FindByID(db, id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Fasilitas tidak ditemukan"})
		}

		// 2. Ambil Data Baru dari Form
		name := c.FormValue("name")
		description := c.FormValue("description")
		location := c.FormValue("location")
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		// 3. Cek Foto Baru
		photoURL := oldData.PhotoURL // Default: Pakai foto lama
		file, err := c.FormFile("photo")

		if err == nil {
			// Ada foto baru, simpan dan ganti URL
			filename := fmt.Sprintf("%d-%s", time.Now().Unix(), file.Filename)
			savePath := filepath.Join("./uploads", filename)
			if err := c.SaveFile(file, savePath); err == nil {
				photoURL = fmt.Sprintf("http://localhost:3000/uploads/%s", filename)
			}
		}

		// 4. Update Database
		newData := Facility{
			Name:        name,
			Description: description,
			Location:    location,
			Capacity:    capacity,
			Price:       price,
			PhotoURL:    photoURL,
		}

		if err := Update(db, id, newData, userID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Fasilitas berhasil diperbarui"})
	}
}

// ==========================
// DELETE PERMANEN
// ==========================
func DeleteHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		if err := HardDelete(db, id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"message": "Fasilitas dihapus permanen"})
	}
}

// ==========================
// TOGGLE STATUS (AKTIF/NONAKTIF)
// ==========================
func ToggleStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		userID := c.Locals("user_id").(string)

		// Baca JSON body: { "is_active": true/false }
		var req struct {
			IsActive bool `json:"is_active"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Format JSON salah"})
		}

		if err := ToggleActive(db, id, req.IsActive, userID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		msg := "Fasilitas dinonaktifkan"
		if req.IsActive {
			msg = "Fasilitas diaktifkan"
		}

		return c.JSON(fiber.Map{"message": msg})
	}
}
