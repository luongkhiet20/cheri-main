/**
 * create-db.js — Tạo database cheri_db nếu chưa tồn tại
 * Chạy: node create-db.js
 *
 * Script này kết nối tới PostgreSQL mặc định (database "postgres")
 * và tạo database "cheri_db" nếu chưa có.
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

async function createDatabase() {
  const dbName = process.env.DB_NAME || "cheri_db";

  // Connect to default "postgres" database first
  const client = new pg.Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: "postgres", // connect to default db
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL server.");

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully!`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists.`);
    }
  } catch (err) {
    if (err.code === "28P01") {
      console.error(
        "\n❌ Sai mật khẩu PostgreSQL!\n" +
        "Vui lòng mở file .env và sửa DB_PASSWORD thành mật khẩu bạn đã đặt khi cài PostgreSQL.\n" +
        "Ví dụ: DB_PASSWORD=matkhaucuaban\n"
      );
    } else {
      console.error("❌ Error creating database:", err.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
