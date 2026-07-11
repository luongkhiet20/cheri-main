import { query } from "./db.js";
import { CHERI_PRODUCTS } from "./src/data.js";

async function seedProducts() {
  console.log("Seeding CHERI_PRODUCTS into PostgreSQL...");
  try {
    for (const p of CHERI_PRODUCTS) {
      console.log(`- Inserting: ${p.name}`);
      
      // Map category
      let categoryName = p.categoryName || "Khác";
      if (p.category === "tops") categoryName = "Tops";
      if (p.category === "dresses") categoryName = "Dresses";
      if (p.category === "bottoms") categoryName = "Bottoms";
      if (p.category === "outerwear") categoryName = "Outerwear";
      
      // Insert or get category
      const catRes = await query("SELECT MaDanhMuc FROM danhmuc WHERE TenDanhMuc = $1", [categoryName]);
      let maCat;
      if (catRes.rows.length > 0) {
        maCat = catRes.rows[0].madanhmuc;
      } else {
        const insertCat = await query("INSERT INTO danhmuc (TenDanhMuc) VALUES ($1) RETURNING MaDanhMuc", [categoryName]);
        maCat = insertCat.rows[0].madanhmuc;
      }
      
      // Insert Product
      // Check if product already exists to avoid duplicates
      const prodCheck = await query("SELECT MaSP FROM sanpham WHERE TenSP = $1", [p.name]);
      if (prodCheck.rows.length > 0) {
         console.log(`  Skipping (already exists)`);
         continue;
      }
      
      const insertSp = await query(
        `INSERT INTO sanpham (MaDanhMuc, TenSP, MoTa, Gia, ChatLieu, TrangThai) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING MaSP`,
        [
          maCat, 
          p.name, 
          p.description || p.details?.join("\\n") || "", 
          p.price || 0, 
          "Cao cấp", 
          p.inStock ? "Còn hàng" : "Hết hàng"
        ]
      );
      const maSP = insertSp.rows[0].masp;
      
      // Insert Images
      const allImages = p.images || [];
      if (p.image && !allImages.includes(p.image)) allImages.unshift(p.image);
      if (p.secondaryImage && !allImages.includes(p.secondaryImage)) allImages.push(p.secondaryImage);
      
      const uniqueImages = [...new Set(allImages)];
      for (const imgUrl of uniqueImages) {
        if (imgUrl) {
          await query("INSERT INTO hinhanh_sanpham (MaSP, DuongDanAnh) VALUES ($1, $2)", [maSP, imgUrl]);
        }
      }
      
      // Insert Variants
      const sizes = p.sizes || ["F"];
      const colors = p.colors || [{name: "Default", hex: "#000"}];
      
      for (const s of sizes) {
        // insert or get size
        let maSize;
        const sizeRes = await query("SELECT MaSize FROM size WHERE TenSize = $1", [s]);
        if (sizeRes.rows.length > 0) maSize = sizeRes.rows[0].masize;
        else {
          const insertSize = await query("INSERT INTO size (TenSize) VALUES ($1) RETURNING MaSize", [s]);
          maSize = insertSize.rows[0].masize;
        }
        
        for (const c of colors) {
          // insert or get color
          let maMau;
          const mauRes = await query("SELECT MaMau FROM mausac WHERE TenMau = $1", [c.name]);
          if (mauRes.rows.length > 0) maMau = mauRes.rows[0].mamau;
          else {
            const insertMau = await query("INSERT INTO mausac (TenMau, MaHex) VALUES ($1, $2) RETURNING MaMau", [c.name, c.hex]);
            maMau = insertMau.rows[0].mamau;
          }
          
          await query(
            "INSERT INTO bienthesanpham (MaSP, MaSize, MaMau, SoLuongTon, SKU) VALUES ($1, $2, $3, $4, $5)",
            [maSP, maSize, maMau, p.inStock ? 50 : 0, `SKU-${maSP}-${s}-${c.name}`]
          );
        }
      }
    }
    console.log("Done seeding!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedProducts();
