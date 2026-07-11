/**
 * init-db.js — Khởi tạo Database dựa trên ERD từ PDF
 * Chạy: node init-db.js
 */
import { query, getClient } from "./db.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// ─── SQL: CREATE TABLES ─────────────────────────────────────────────────────
const CREATE_TABLES_SQL = `

-- 1. KHACHHANG
CREATE TABLE IF NOT EXISTS khachhang (
  MaKH SERIAL PRIMARY KEY,
  HoTen TEXT,
  Email TEXT UNIQUE,
  SoDienThoai TEXT,
  MatKhau TEXT,
  NgaySinh TIMESTAMP,
  -- Bổ sung các trường cần thiết cho giao diện web hiện tại
  Tier TEXT DEFAULT 'Bronze',
  Avatar TEXT DEFAULT ''
);

-- 2. Phiên chat
CREATE TABLE IF NOT EXISTS phienchat (
  MaSession SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE CASCADE,
  BatDau TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KetThuc TIMESTAMP
);

-- 3. Tin nhắn chat
CREATE TABLE IF NOT EXISTS tinnhanchat (
  MaMessage SERIAL PRIMARY KEY,
  MaSession INT REFERENCES phienchat(MaSession) ON DELETE CASCADE,
  NguoiGui TEXT,
  NoiDung TEXT,
  ThoiGianGui TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nhân vật ảo
CREATE TABLE IF NOT EXISTS nhanvatao (
  MaNhanVat SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE CASCADE,
  DuongDanAnh3D TEXT,
  NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Hồ sơ cơ thể
CREATE TABLE IF NOT EXISTS hosocothe (
  MaHoSo SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE CASCADE,
  ChieuCao FLOAT,
  CanNang FLOAT,
  Vong1 FLOAT,
  Vong2 FLOAT,
  Vong3 FLOAT
);

-- 6. Đơn hàng
CREATE TABLE IF NOT EXISTS donhang (
  MaDonHang SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE SET NULL,
  NgayDat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  TongTien FLOAT,
  TrangThai TEXT,
  Trang_Thai_Text TEXT,
  Dia_Chi TEXT,
  SDT TEXT,
  Email TEXT,
  Ghi_Chu TEXT,
  Phuong_Thuc_Thanh_Toan TEXT,
  Phuong_Thuc_Van_Chuyen TEXT,
  -- Bổ sung trường này để lưu mã đơn hàng thân thiện (VD: CR-1234) dùng trên web
  MaDonHangStr TEXT UNIQUE
);

-- 7. Vận chuyển
CREATE TABLE IF NOT EXISTS vanchuyen (
  MaVanChuyen SERIAL PRIMARY KEY,
  MaDonHang INT REFERENCES donhang(MaDonHang) ON DELETE CASCADE,
  PhuongThucVC TEXT,
  MaVVD TEXT,
  NgayGui TIMESTAMP,
  NgayNhanDuKien TIMESTAMP
);

-- 8. Thanh toán
CREATE TABLE IF NOT EXISTS thanhtoan (
  MaThanhToan SERIAL PRIMARY KEY,
  MaDonHang INT REFERENCES donhang(MaDonHang) ON DELETE CASCADE,
  PhuongThuc TEXT,
  SoTien FLOAT,
  TrangThai TEXT,
  NgayThanhToan TIMESTAMP
);

-- 10. DANHMUC
CREATE TABLE IF NOT EXISTS danhmuc (
  MaDanhMuc SERIAL PRIMARY KEY,
  TenDanhMuc TEXT NOT NULL,
  MoTa TEXT
);

-- 11. SANPHAM
CREATE TABLE IF NOT EXISTS sanpham (
  MaSP SERIAL PRIMARY KEY,
  MaDanhMuc INT REFERENCES danhmuc(MaDanhMuc) ON DELETE SET NULL,
  TenSP TEXT NOT NULL,
  MoTa TEXT,
  Gia DECIMAL NOT NULL,
  ChatLieu TEXT,
  TrangThai TEXT
);

-- 9. Đánh giá (đưa xuống dưới SANPHAM vì có FK trỏ tới SANPHAM)
CREATE TABLE IF NOT EXISTS danhgia (
  MaDanhGia SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE SET NULL,
  MaSP INT REFERENCES sanpham(MaSP) ON DELETE CASCADE,
  SoSao INT,
  BinhLuan TEXT,
  NgayDanhGia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. SIZE
CREATE TABLE IF NOT EXISTS size (
  MaSize SERIAL PRIMARY KEY,
  TenSize TEXT NOT NULL
);

-- 13. MAUSAC
CREATE TABLE IF NOT EXISTS mausac (
  MaMau SERIAL PRIMARY KEY,
  TenMau TEXT NOT NULL,
  MaHex TEXT
);

-- 14. BIENTHESANPHAM
CREATE TABLE IF NOT EXISTS bienthesanpham (
  MaBienThe SERIAL PRIMARY KEY,
  MaSP INT REFERENCES sanpham(MaSP) ON DELETE CASCADE,
  MaSize INT REFERENCES size(MaSize) ON DELETE CASCADE,
  MaMau INT REFERENCES mausac(MaMau) ON DELETE CASCADE,
  SoLuongTon INT NOT NULL DEFAULT 0,
  SKU TEXT NOT NULL
);

-- 15. HINHANH_SANPHAM
CREATE TABLE IF NOT EXISTS hinhanh_sanpham (
  MaAnh SERIAL PRIMARY KEY,
  MaSP INT NOT NULL REFERENCES sanpham(MaSP) ON DELETE CASCADE,
  DuongDanAnh TEXT NOT NULL
);

-- 16. DIACHI
CREATE TABLE IF NOT EXISTS diachi (
  MaDiaChi SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE CASCADE,
  NguoiNhan TEXT NOT NULL,
  SDTNguoiNhan TEXT NOT NULL,
  DiaChiChiTiet TEXT,
  PhuongXa TEXT NOT NULL,
  QuanHuyen TEXT NOT NULL,
  TinhThanh TEXT NOT NULL
);

-- 17. GIOHANG
CREATE TABLE IF NOT EXISTS giohang (
  MaGioHang SERIAL PRIMARY KEY,
  MaKH INT REFERENCES khachhang(MaKH) ON DELETE CASCADE,
  NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. CHITIET_GIOHANG
CREATE TABLE IF NOT EXISTS chitiet_giohang (
  MaGioHang INT REFERENCES giohang(MaGioHang) ON DELETE CASCADE,
  MaBienThe INT REFERENCES bienthesanpham(MaBienThe) ON DELETE CASCADE,
  SoLuong INT NOT NULL,
  PRIMARY KEY (MaGioHang, MaBienThe)
);

-- 19. CHITIET_DONHANG
CREATE TABLE IF NOT EXISTS chitiet_donhang (
  MaDonHang INT REFERENCES donhang(MaDonHang) ON DELETE CASCADE,
  MaBienThe INT REFERENCES bienthesanpham(MaBienThe) ON DELETE CASCADE,
  SoLuong INT NOT NULL,
  DonGia DECIMAL NOT NULL,
  PRIMARY KEY (MaDonHang, MaBienThe)
);

`;

// ─── SEED DATA ──────────────────────────────────────────────────────────────

async function seedDefaultUsers(client) {
  const existing = await client.query("SELECT COUNT(*) as cnt FROM khachhang");
  if (parseInt(existing.rows[0].cnt) > 0) return;

  console.log("  → Seeding default users...");
  const users = [
    {
      HoTen: "Nguyễn Thơ",
      Email: "contact.cheri@gmail.com",
      MatKhau: "cheri123",
      SoDienThoai: "0881 1880 080",
      Tier: "Gold",
      Avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    },
  ];

  for (const u of users) {
    const hashedPw = await bcrypt.hash(u.MatKhau, SALT_ROUNDS);
    await client.query(
      `INSERT INTO khachhang (HoTen, Email, MatKhau, SoDienThoai, Tier, Avatar)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [u.HoTen, u.Email, hashedPw, u.SoDienThoai, u.Tier, u.Avatar]
    );
  }
}

async function seedProductsAndVariants(client) {
  const existing = await client.query("SELECT COUNT(*) as cnt FROM sanpham");
  if (parseInt(existing.rows[0].cnt) > 0) return;

  console.log("  → Seeding default products & variants...");

  // 1. Tạo Danh Mục
  const cats = await Promise.all([
    client.query("INSERT INTO danhmuc (TenDanhMuc) VALUES ('Tops') RETURNING MaDanhMuc"),
    client.query("INSERT INTO danhmuc (TenDanhMuc) VALUES ('Dresses') RETURNING MaDanhMuc"),
    client.query("INSERT INTO danhmuc (TenDanhMuc) VALUES ('Outerwear') RETURNING MaDanhMuc"),
    client.query("INSERT INTO danhmuc (TenDanhMuc) VALUES ('Bottoms') RETURNING MaDanhMuc"),
  ]);
  const [topCat, dressCat, outerCat, bottomCat] = cats.map(c => c.rows[0].madanhmuc);

  // 2. Tạo Size và Màu
  const sizeS = (await client.query("INSERT INTO size (TenSize) VALUES ('S') RETURNING MaSize")).rows[0].masize;
  const sizeM = (await client.query("INSERT INTO size (TenSize) VALUES ('M') RETURNING MaSize")).rows[0].masize;
  const colorRed = (await client.query("INSERT INTO mausac (TenMau, MaHex) VALUES ('Đỏ Chéri Trầm', '#8B0000') RETURNING MaMau")).rows[0].mamau;
  const colorWhite = (await client.query("INSERT INTO mausac (TenMau, MaHex) VALUES ('Trắng Ivory', '#FFFFF0') RETURNING MaMau")).rows[0].mamau;

  // 3. Tạo 1 Sản Phẩm Mẫu
  const spRes = await client.query(
    "INSERT INTO sanpham (MaDanhMuc, TenSP, MoTa, Gia, ChatLieu, TrangThai) VALUES ($1, $2, $3, $4, $5, $6) RETURNING MaSP",
    [topCat, "Áo Sơ Mi Lụa Mulberry (Mulberry Silk Shirt)", "Lụa tơ tằm thượng hạng", 1250000, "Lụa Mulberry", "Còn hàng"]
  );
  const maSP1 = spRes.rows[0].masp;

  // 4. Tạo Biến Thể
  await client.query(
    "INSERT INTO bienthesanpham (MaSP, MaSize, MaMau, SoLuongTon, SKU) VALUES ($1, $2, $3, $4, $5)",
    [maSP1, sizeS, colorRed, 10, "SKU-MULBERRY-S-RED"]
  );
  await client.query(
    "INSERT INTO bienthesanpham (MaSP, MaSize, MaMau, SoLuongTon, SKU) VALUES ($1, $2, $3, $4, $5)",
    [maSP1, sizeM, colorWhite, 5, "SKU-MULBERRY-M-WHITE"]
  );

  // 5. Thêm Hình Ảnh
  await client.query(
    "INSERT INTO hinhanh_sanpham (MaSP, DuongDanAnh) VALUES ($1, $2)",
    [maSP1, "/images/products/shirt-red.jpg"]
  );
}

// ─── MAIN INIT FUNCTION ─────────────────────────────────────────────────────

export async function initDatabase() {
  console.log("🗄️  Initializing Chéri PostgreSQL database according to PDF ERD...");

  const client = await getClient();
  try {
    // Để an toàn khi chạy lại, tạm thời drop các bảng cũ nếu có (nếu bạn muốn làm sạch).
    // Tuy nhiên lệnh CREATE TABLE IF NOT EXISTS sẽ đảm bảo bảng được tạo nếu chưa có.

    // Create all tables
    await client.query(CREATE_TABLES_SQL);
    console.log("  ✅ All tables created successfully.");

    // Seed data
    await seedDefaultUsers(client);
    await seedProductsAndVariants(client);

    console.log("  ✅ Database initialization complete.\n");
  } catch (err) {
    console.error("  ❌ Database initialization failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Allow running directly: node init-db.js
if (process.argv[1] && process.argv[1].includes("init-db")) {
  initDatabase()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
