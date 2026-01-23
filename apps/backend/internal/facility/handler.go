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
// HELPER: PROCESS UPLOADS
// ==========================
// Fungsi ini menangani upload multiple files (Maksimal 4)
func processUploads(c *fiber.Ctx) []string {
	// Ambil Multipart Form
	form, err := c.MultipartForm()
	if err != nil {
		return []string{}
	}

	// Ambil file dari key "photos" (harus sesuai dengan yang dikirim frontend)
	files := form.File["photos"]
	var photoURLs []string

	// Loop setiap file
	for i, file := range files {
		// Batasi hanya 4 foto
		if i >= 4 {
			break
		}

		// Buat nama unik: timestamp-index-namafile
		filename := fmt.Sprintf("%d-%d-%s", time.Now().Unix(), i, file.Filename)

		// Simpan ke folder uploads
		savePath := filepath.Join("./uploads", filename)
		if err := c.SaveFile(file, savePath); err == nil {
			// Jika sukses, tambahkan URL ke list
			photoURLs = append(photoURLs, fmt.Sprintf("/uploads/%s", filename))
		}
	}

	return photoURLs
}

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
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		// 2. Handle Multiple Upload
		// Panggil helper function kita
		photoURLs := processUploads(c)

		// 3. Simpan ke DB
		f := Facility{
			Name:        name,
			Description: description,
			Location:    location,
			Capacity:    capacity,
			Price:       price,
			PhotoURL:    photoURLs, // Field ini sekarang adalah []string (Array)
		}

		if err := Insert(db, f, userID); err != nil {
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
		data, err := FindAll(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal ambil data"})
		}
		return c.JSON(data)
	}
}

// ==========================
// GET ONE DETAIL (WAJIB ADA)
// ==========================
func GetOneHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		// Menggunakan fungsi FindByID yang sudah ada di repository.go
		data, err := FindByID(db, id)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.Status(404).JSON(fiber.Map{"error": "Fasilitas tidak ditemukan"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
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

		// 1. Ambil data lama (untuk cek foto lama)
		oldData, err := FindByID(db, id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Fasilitas tidak ditemukan"})
		}

		// 2. Ambil Data Baru
		name := c.FormValue("name")
		description := c.FormValue("description")
		location := c.FormValue("location")
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		// 3. Cek Foto Baru
		newPhotos := processUploads(c)

		// Logika Update Foto:
		// Jika ada foto baru diupload -> Ganti foto lama dengan yang baru.
		// Jika tidak ada foto baru -> Tetap pakai foto lama.
		finalPhotos := oldData.PhotoURL
		if len(newPhotos) > 0 {
			finalPhotos = newPhotos
		}

		// 4. Update Database
		newData := Facility{
			Name:        name,
			Description: description,
			Location:    location,
			Capacity:    capacity,
			Price:       price,
			PhotoURL:    finalPhotos,
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
