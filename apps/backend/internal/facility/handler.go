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
// STRUCT UNTUK SWAGGER
// ==========================
// Kita definisikan struct ini agar Swagger tahu bentuk JSON untuk toggle status
type ToggleStatusReq struct {
	IsActive bool `json:"is_active" example:"true"`
}

// ==========================
// HELPER: PROCESS UPLOADS
// ==========================
func processUploads(c *fiber.Ctx) []string {
	form, err := c.MultipartForm()
	if err != nil {
		return []string{}
	}

	files := form.File["photos"]
	var photoURLs []string

	for i, file := range files {
		if i >= 4 {
			break
		}

		filename := fmt.Sprintf("%d-%d-%s", time.Now().Unix(), i, file.Filename)
		savePath := filepath.Join("./uploads", filename)

		if err := c.SaveFile(file, savePath); err == nil {
			photoURLs = append(photoURLs, fmt.Sprintf("/uploads/%s", filename))
		}
	}

	return photoURLs
}

// ==========================
// CREATE FASILITAS
// ==========================

// @Summary      Tambah Fasilitas Baru
// @Description  Menambahkan fasilitas baru lengkap dengan foto (Hanya Admin).
// @Tags         Facilities
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        name         formData  string  true  "Nama Fasilitas"
// @Param        description  formData  string  true  "Deskripsi"
// @Param        location     formData  string  true  "Lokasi"
// @Param        capacity     formData  int     true  "Kapasitas"
// @Param        price        formData  number  true  "Harga per Jam"
// @Param        photos       formData  []file  false "Upload Foto (Max 4)" collectionFormat(multi)
// @Success      201  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Router       /facilities [post]
func CreateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		name := c.FormValue("name")
		description := c.FormValue("description")
		location := c.FormValue("location")
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		photoURLs := processUploads(c)

		f := Facility{
			Name:        name,
			Description: description,
			Location:    location,
			Capacity:    capacity,
			Price:       price,
			PhotoURL:    photoURLs,
		}

		if err := Insert(db, f, userID); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.Status(201).JSON(fiber.Map{"message": "Fasilitas berhasil dibuat"})
	}
}

// ==========================
// LIST FASILITAS
// ==========================

// @Summary      Lihat Semua Fasilitas
// @Description  Menampilkan daftar semua fasilitas yang tersedia.
// @Tags         Facilities
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}   Facility
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /facilities [get]
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
// GET ONE DETAIL
// ==========================

// @Summary      Detail Fasilitas
// @Description  Melihat detail satu fasilitas berdasarkan ID.
// @Tags         Facilities
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID Fasilitas"
// @Success      200  {object}  Facility
// @Failure      404  {object}  map[string]string
// @Router       /facilities/{id} [get]
func GetOneHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

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
// UPDATE FASILITAS
// ==========================

// @Summary      Update Fasilitas
// @Description  Mengubah data fasilitas (Full Update/PUT). Semua field teks WAJIB diisi ulang.
// @Tags         Facilities
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        id           path      string  true  "ID Fasilitas"
// @Param        name         formData  string  true  "Nama Fasilitas (Wajib)"
// @Param        description  formData  string  true  "Deskripsi (Wajib)"
// @Param        location     formData  string  true  "Lokasi (Wajib)"
// @Param        capacity     formData  int     true  "Kapasitas (Wajib)"
// @Param        price        formData  number  true  "Harga (Wajib)"
// @Param        photos       formData  []file  false "Foto Baru (Opsional, jika diisi akan menimpa yang lama)" collectionFormat(multi)
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Router       /facilities/{id} [put]
func UpdateHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		userID := c.Locals("user_id").(string)

		oldData, err := FindByID(db, id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Fasilitas tidak ditemukan"})
		}

		// Karena ini PUT, kita asumsikan semua data dikirim ulang.
		// Jika form kosong, data akan tertimpa string kosong.
		name := c.FormValue("name")
		description := c.FormValue("description")
		location := c.FormValue("location")
		capacity, _ := strconv.Atoi(c.FormValue("capacity"))
		price, _ := strconv.ParseFloat(c.FormValue("price"), 64)

		newPhotos := processUploads(c)

		// Logika foto tetap sama (hanya ganti jika ada upload baru)
		finalPhotos := oldData.PhotoURL
		if len(newPhotos) > 0 {
			finalPhotos = newPhotos
		}

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

// @Summary      Hapus Fasilitas
// @Description  Menghapus fasilitas secara permanen (Hanya Admin).
// @Tags         Facilities
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID Fasilitas"
// @Success      200  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /facilities/{id} [delete]
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
// TOGGLE STATUS
// ==========================

// @Summary      Aktif/Nonaktifkan Fasilitas
// @Description  Mengubah status aktif fasilitas (Hanya Admin).
// @Tags         Facilities
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      string           true  "ID Fasilitas"
// @Param        request  body      ToggleStatusReq  true  "Payload JSON"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      403      {object}  map[string]string
// @Router       /facilities/{id}/status [patch]
func ToggleStatusHandler(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		userID := c.Locals("user_id").(string)

		// Menggunakan struct ToggleStatusReq yang sudah didefinisikan di atas
		var req ToggleStatusReq

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
