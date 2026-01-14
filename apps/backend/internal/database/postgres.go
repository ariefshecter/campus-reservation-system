package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func Connect() *sql.DB {
	dsn := os.Getenv("DATABASE_URL")

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Gagal konek DB:", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal("DB tidak bisa di-ping:", err)
	}

	log.Println("Database connected")
	return db
}
