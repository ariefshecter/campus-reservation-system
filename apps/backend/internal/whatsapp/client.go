package whatsapp

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type SendMessageRequest struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

// SendOTP mengirimkan pesan OTP menggunakan layanan external WA Gateway
func SendOTP(phone string, code string) error {
	gatewayURL := os.Getenv("WA_GATEWAY_URL")
	if gatewayURL == "" {
		return errors.New("WA_GATEWAY_URL belum diset di .env")
	}

	// Format nomor HP ke format JID WhatsApp (628xxx@s.whatsapp.net)
	// Asumsi input user 08xxx atau 628xxx
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
	req.SetBasicAuth("user1", "pass1")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi WA gateway: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("WA gateway merespon dengan status: %d", resp.StatusCode)
	}

	return nil
}

// FormatPhoneToJID mengubah 08xx menjadi 628xx@s.whatsapp.net
func FormatPhoneToJID(phone string) string {
	phone = strings.TrimSpace(phone)
	if strings.HasPrefix(phone, "08") {
		phone = "62" + phone[1:]
	}
	// Pastikan tidak ada karakter aneh
	if !strings.HasSuffix(phone, "@s.whatsapp.net") {
		phone = phone + "@s.whatsapp.net"
	}
	return phone
}
