package whatsapp

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Struct untuk payload kirim pesan
type SendMessageRequest struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

// Struct untuk respon dari endpoint /user/check
type UserCheckResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Results struct {
		IsOnWhatsapp bool `json:"is_on_whatsapp"`
	} `json:"results"`
}

// ============================================================================
// 1. SEND OTP
// ============================================================================

func SendOTP(phone string, code string) error {
	gatewayURL := os.Getenv("WA_GATEWAY_URL")
	if gatewayURL == "" {
		return errors.New("WA_GATEWAY_URL belum diset di .env")
	}

	// Format ke JID untuk pengiriman pesan (biasanya butuh @s.whatsapp.net)
	formattedPhone := FormatPhoneToJID(phone)

	msg := fmt.Sprintf("Kode OTP Kampus Reservation Anda adalah: *%s*\n\nJangan berikan kode ini kepada siapapun. Berlaku selama 5 menit.", code)

	payload := SendMessageRequest{
		Phone:   formattedPhone,
		Message: msg,
	}

	jsonPayload, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", gatewayURL+"/send/message", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	// Auth (sesuaikan dengan config gateway Anda)
	req.SetBasicAuth("user1", "pass1")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi WA gateway: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		fmt.Printf("[WA-ERROR] Send OTP Status: %d, Body: %s\n", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("WA gateway merespon dengan status: %d", resp.StatusCode)
	}

	return nil
}

// ============================================================================
// 2. CHECK USER (VALIDASI NOMOR WA)
// ============================================================================

func CheckUser(phone string) (bool, error) {
	gatewayURL := os.Getenv("WA_GATEWAY_URL")
	if gatewayURL == "" {
		// Jika URL tidak ada, kita loloskan saja (fail-open)
		return true, nil
	}

	// 1. Format nomor menjadi angka saja (misal: 628123456)
	cleanPhone := FormatPhoneToNumberOnly(phone)

	// 2. Siapkan Request GET ke /user/check?phone=...
	client := &http.Client{Timeout: 5 * time.Second}

	requestURL := fmt.Sprintf("%s/user/check?phone=%s", gatewayURL, cleanPhone)

	// Debug Log untuk memastikan nomor sudah benar (harus ada angka 8 setelah 62)
	fmt.Printf("[WA-DEBUG] Checking URL: %s\n", requestURL)

	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return false, err
	}

	// Auth (sesuaikan dengan config gateway Anda)
	req.SetBasicAuth("user1", "pass1")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[WA-ERROR] Connection Failed: %v\n", err)
		return false, fmt.Errorf("koneksi ke WA gateway gagal")
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 401 {
		fmt.Println("[WA-ERROR] Unauthorized! Cek username/password gateway.")
		return false, fmt.Errorf("gagal login ke gateway (401)")
	}

	if resp.StatusCode == 200 {
		var result UserCheckResponse
		if err := json.Unmarshal(bodyBytes, &result); err != nil {
			fmt.Println("[WA-ERROR] Gagal parse JSON:", err)
			return false, fmt.Errorf("respon gateway tidak valid")
		}

		fmt.Printf("[WA-DEBUG] Is On WA: %v\n", result.Results.IsOnWhatsapp)
		return result.Results.IsOnWhatsapp, nil
	}

	return false, fmt.Errorf("gateway error: %d - %s", resp.StatusCode, string(bodyBytes))
}

// ============================================================================
// HELPER
// ============================================================================

func FormatPhoneToJID(phone string) string {
	phone = FormatPhoneToNumberOnly(phone)
	if !strings.HasSuffix(phone, "@s.whatsapp.net") {
		phone = phone + "@s.whatsapp.net"
	}
	return phone
}

func FormatPhoneToNumberOnly(phone string) string {
	phone = strings.TrimSpace(phone)
	// Hapus semua karakter non-digit
	phone = strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// [PERBAIKAN LOGIC DISINI]
	// Ubah 08 ke 628. Sebelumnya salah hapus 2 digit.
	if strings.HasPrefix(phone, "08") {
		// Hapus '0' saja (index 1 sampai akhir), '8' tetap terbawa
		phone = "62" + phone[1:]
	} else if strings.HasPrefix(phone, "8") {
		// Jika user input "831...", tambahkan 62
		phone = "62" + phone
	}

	return phone
}
