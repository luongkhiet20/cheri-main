import { query } from "./db.js";

function mapColorNameToHex(name) {
  const norm = (name || "").toLowerCase().trim();
  if (norm.includes("chéri") || norm.includes("chéry") || norm.includes("cherry")) return "#74070e";
  if (norm.includes("đỏ")) return "#C21807";
  if (norm.includes("trắng") || norm.includes("white") || norm.includes("ivory") || norm.includes("kem")) return "#FAF8F5";
  if (norm.includes("đen") || norm.includes("black") || norm.includes("obsidian")) return "#1A1A1A";
  if (norm.includes("be") || norm.includes("beige")) return "#F5F2EB";
  if (norm.includes("xám") || norm.includes("grey") || norm.includes("gray")) return "#A9A9A9";
  if (norm.includes("nâu") || norm.includes("brown") || norm.includes("caramel")) return "#8B5A2B";
  if (norm.includes("vàng") || norm.includes("gold") || norm.includes("yellow")) return "#FADA5E";
  if (norm.includes("navy") || norm.includes("xanh navy")) return "#002060";
  if (norm.includes("xanh lá") || norm.includes("green") || norm.includes("emerald")) return "#2E8B57";
  if (norm.includes("xanh nhạt") || norm.includes("mint") || norm.includes("xanh lơ")) return "#E0F2F1";
  if (norm.includes("xanh") || norm.includes("blue")) return "#4A90E2";
  if (norm.includes("tím nhạt") || norm.includes("lavender")) return "#E6E6FA";
  if (norm.includes("tím") || norm.includes("purple")) return "#8A2BE2";
  if (norm.includes("hồng") || norm.includes("pink")) return "#FFC0CB";
  if (norm === "áo") return "#E8E1D9";
  if (norm === "quần") return "#3D3D3D";
  if (norm.includes("quần jean")) return "#4B6F96";
  if (norm === "váy" || norm === "chân váy") return "#CDB4A2";
  if (norm === "full set") return "#74070e";
  if (norm === "khăn choàng") return "#E6D7C3";
  return "#D4C5B9"; 
}

function getPlaceholderImageForCategory(category, secondary = false) {
  if (category === "tops") return secondary ? "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1548624149-f95ab51fc05b?auto=format&fit=crop&q=80&w=800";
  if (category === "bottoms") return secondary ? "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&q=80&w=800";
  if (category === "outerwear") return secondary ? "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800";
  return secondary ? "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800";
}

function splitCSVLine(line, sep) {
  const result = [];
  let current = "";
  let insideQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === sep && !insideQuote) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseTSV(tsvText) {
  const lines = tsvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0] || "";
  const separator = headerLine.includes("\t") ? "\t" : ",";

  const rowsList = [];
  let buffer = "";

  for (const line of lines) {
    if (buffer) {
      buffer += "\n" + line;
    } else {
      buffer = line;
    }

    const quoteCount = (buffer.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      const cols = splitCSVLine(buffer, separator).map((c) =>
        c.trim().replace(/^"(.*)"$/, "$1").replace(/""/g, '"')
      );
      rowsList.push(cols);
      buffer = "";
    }
  }

  if (rowsList.length < 2) return [];

  const headers = rowsList[0].map((h) => h.trim().toLowerCase());

  const getCol = (cols, name, fallbackIdx) => {
    const idx = headers.indexOf(name.toLowerCase());
    if (idx !== -1 && idx < cols.length) return cols[idx];
    if (fallbackIdx !== -1 && fallbackIdx < cols.length) return cols[fallbackIdx];
    return "";
  };

  const groups = {};
  for (let i = 1; i < rowsList.length; i++) {
    const cols = rowsList[i];
    if (cols.length === 0 || !cols[0]) continue;
    const productGroupId = getCol(cols, "handle", 0);
    if (!productGroupId) continue;
    if (!groups[productGroupId]) groups[productGroupId] = [];
    groups[productGroupId].push(cols);
  }

  const parsedProducts = [];
  for (const [groupId, rows] of Object.entries(groups)) {
    const productRow = rows.find((r) => {
      const ft = getCol(r, "fieldType", 1);
      return ft && ft.toUpperCase() === "PRODUCT";
    });
    if (!productRow) continue;

    const name = getCol(productRow, "name", 2) || "Sản Phẩm Chéri Vy";
    const visibleStr = (getCol(productRow, "visible", 3) || "TRUE").toString().trim().toUpperCase();
    const isVisible = visibleStr === "TRUE" || visibleStr === "1";
    if (!isVisible) continue;

    const rawDescription = getCol(productRow, "plainDescription", 4) || "";
    const description = rawDescription.replace(/<\/?[^>]+(>|$)/g, "").trim();

    const categoryPath = (getCol(productRow, "categorySlugs", 5) || "").toLowerCase();
    let category = "dresses";
    let categoryName = "Đầm Thiết Kế";
    
    if (categoryPath.includes("áo") || categoryPath.includes("top") || categoryPath.includes("shirt") || categoryPath.includes("gile") || categoryPath.includes("corset")) {
      category = "tops"; categoryName = "Áo Thiết Kế";
    } else if (categoryPath.includes("quần") || categoryPath.includes("váy") || categoryPath.includes("bottom") || categoryPath.includes("skirt")) {
      category = "bottoms"; categoryName = "Chân Váy & Quần";
    } else if (categoryPath.includes("blazer") || categoryPath.includes("tweed") || categoryPath.includes("khoác") || categoryPath.includes("outerwear") || categoryPath.includes("jacket")) {
      category = "outerwear"; categoryName = "Áo Khoác & Blazer";
    } else if (categoryPath.includes("đầm") || categoryPath.includes("dress") || categoryPath.includes("dresses") || categoryPath.includes("tiệc")) {
      category = "dresses"; categoryName = "Đầm Thiết Kế";
    } else {
      const lowerName = name.toLowerCase();
      if (lowerName.includes("đầm") || lowerName.includes("dress")) {
        category = "dresses"; categoryName = "Đầm Thiết Kế";
      } else if (lowerName.includes("áo sơ mi") || lowerName.includes("áo thun") || lowerName.includes("áo gile") || lowerName.includes("áo lụa") || lowerName.includes("áo thắt nơ") || lowerName.includes("áo yếm") || lowerName.includes("top") || lowerName.includes("corset")) {
        category = "tops"; categoryName = "Áo Thiết Kế";
      } else if (lowerName.includes("quần") || lowerName.includes("chân váy") || lowerName.includes("váy") || lowerName.includes("skirt")) {
        category = "bottoms"; categoryName = "Chân Váy & Quần";
      } else if (lowerName.includes("blazer") || lowerName.includes("khoác") || lowerName.includes("áo len") || lowerName.includes("áo khoác")) {
        category = "outerwear"; categoryName = "Áo Khoác & Blazer";
      }
    }

    let sizesSet = new Set();
    const colorsList = [];

    const getOptionValues = (optName, optChoices) => {
      if (!optName || !optChoices) return;
      const lowerName = optName.toLowerCase().trim();
      const choices = optChoices.split(";").map((v) => v.trim()).filter(Boolean);
      if (lowerName.includes("size") || lowerName.includes("kích cỡ") || lowerName.includes("kích thước")) {
        choices.forEach((v) => { if (v) sizesSet.add(v); });
      } else if (lowerName.includes("color") || lowerName.includes("màu") || lowerName.includes("sắc") || lowerName.includes("col")) {
        choices.forEach((v) => {
          if (!v) return;
          if (v.includes(":")) {
            const parts = v.split(":");
            const hex = parts[0].trim();
            const cname = parts[1].trim();
            if (!colorsList.some((col) => col.name.toLowerCase() === cname.toLowerCase())) {
              colorsList.push({ name: cname, hex });
            }
          } else {
            const hex = mapColorNameToHex(v);
            if (!colorsList.some((col) => col.name.toLowerCase() === v.toLowerCase())) {
              colorsList.push({ name: v, hex });
            }
          }
        });
      }
    };

    for (let j = 1; j <= 6; j++) {
      const optName = getCol(productRow, `productOptionName${j}`, -1);
      const optChoices = getCol(productRow, `productOptionChoices${j}`, -1);
      if (optName && optChoices) getOptionValues(optName, optChoices);
    }

    const variantRows = rows.filter((r) => {
      const ft = getCol(r, "fieldType", 1);
      return ft && ft.toUpperCase() === "VARIANT";
    });

    let basePrice = 0;
    let inStock = false;
    let totalStock = 0;

    const cleanPriceString = (str) => {
      if (!str) return "0";
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount > 1) return str.replace(/\./g, "").replace(/[^0-9]/g, "");
      return str.replace(/,/g, "").trim();
    };

    if (variantRows.length > 0) {
      const salePrices = variantRows.map((r) => parseFloat(cleanPriceString(getCol(r, "price", 11)))).filter((p) => !isNaN(p) && p > 0);
      basePrice = salePrices.length > 0 ? Math.min(...salePrices) : 0;
      
      const stockCounts = variantRows.map((r) => parseInt(getCol(r, "inventory", 14) || "0")).filter((s) => !isNaN(s));
      totalStock = stockCounts.reduce((a, b) => a + b, 0);
      inStock = totalStock > 0;

      variantRows.forEach((vr) => {
        for (let j = 1; j <= 6; j++) {
          const optName = getCol(vr, `productOptionName${j}`, -1);
          const optChoices = getCol(vr, `productOptionChoices${j}`, -1);
          if (optName && optChoices) {
            const lowerName = optName.toLowerCase().trim();
            if (lowerName.includes("size") || lowerName.includes("kích cỡ") || lowerName.includes("kích thước")) {
              sizesSet.add(optChoices);
            } else if (lowerName.includes("color") || lowerName.includes("màu") || lowerName.includes("sắc") || lowerName.includes("col")) {
              if (!colorsList.some((col) => col.name.toLowerCase() === optChoices.toLowerCase())) {
                colorsList.push({ name: optChoices, hex: mapColorNameToHex(optChoices) });
              }
            }
          }
        }
      });
    }

    if (basePrice === 0) {
      basePrice = parseFloat(cleanPriceString(getCol(productRow, "price", 11))) || 450000;
    }
    if (variantRows.length === 0) {
      totalStock = parseInt(getCol(productRow, "inventory", 14) || "0");
      inStock = isNaN(totalStock) ? true : totalStock > 0;
      if(isNaN(totalStock)) totalStock = 10;
    }

    const mediaRows = rows.filter((r) => {
      const ft = getCol(r, "fieldType", 1);
      return ft && ft.toUpperCase() === "MEDIA";
    });

    const images = [];
    mediaRows.forEach((mr) => {
      const mediaVal = getCol(mr, "media", 7);
      if (mediaVal) {
        if (mediaVal.startsWith("http")) images.push(mediaVal);
        else images.push(`https://static.wixstatic.com/media/${mediaVal}`);
      }
    });

    if (images.length === 0) {
      images.push(getPlaceholderImageForCategory(category));
      images.push(getPlaceholderImageForCategory(category, true));
    }

    parsedProducts.push({
      id: groupId,
      name,
      price: basePrice,
      category,
      categoryName,
      colors: colorsList.length > 0 ? colorsList : [{name: "Mặc định", hex: "#000"}],
      sizes: Array.from(sizesSet).length > 0 ? Array.from(sizesSet) : ["F"],
      description,
      inStock,
      totalStock,
      images,
    });
  }

  return parsedProducts;
}

async function seedTSVToDB() {
  console.log("Fetching TSV from Google Sheets...");
  try {
    const sheetId = "1Qe41ZrCGUaHXNnftPTyaYwzpLiW2E3xpGcrCMk4muLI";
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv`;
    const response = await fetch(sheetUrl);
    const tsvText = await response.text();
    const products = parseTSV(tsvText);
    
    console.log(`Parsed ${products.length} products. Inserting into Postgres...`);
    
    for (const p of products) {
      console.log(`- Inserting: ${p.name}`);
      
      const catRes = await query("SELECT MaDanhMuc FROM danhmuc WHERE TenDanhMuc = $1", [p.categoryName]);
      let maCat;
      if (catRes.rows.length > 0) {
        maCat = catRes.rows[0].madanhmuc;
      } else {
        const insertCat = await query("INSERT INTO danhmuc (TenDanhMuc) VALUES ($1) RETURNING MaDanhMuc", [p.categoryName]);
        maCat = insertCat.rows[0].madanhmuc;
      }
      
      const prodCheck = await query("SELECT MaSP FROM sanpham WHERE TenSP = $1", [p.name]);
      if (prodCheck.rows.length > 0) {
         console.log(`  Skipping (already exists)`);
         continue;
      }
      
      const insertSp = await query(
        `INSERT INTO sanpham (MaDanhMuc, TenSP, MoTa, Gia, ChatLieu, TrangThai) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING MaSP`,
        [maCat, p.name, p.description || "", p.price, "Cao cấp", p.inStock ? "Còn hàng" : "Hết hàng"]
      );
      const maSP = insertSp.rows[0].masp;
      
      const uniqueImages = [...new Set(p.images)];
      for (const imgUrl of uniqueImages) {
        if (imgUrl) {
          await query("INSERT INTO hinhanh_sanpham (MaSP, DuongDanAnh) VALUES ($1, $2)", [maSP, imgUrl]);
        }
      }
      
      for (const s of p.sizes) {
        let maSize;
        const sizeRes = await query("SELECT MaSize FROM size WHERE TenSize = $1", [s]);
        if (sizeRes.rows.length > 0) maSize = sizeRes.rows[0].masize;
        else {
          const insertSize = await query("INSERT INTO size (TenSize) VALUES ($1) RETURNING MaSize", [s]);
          maSize = insertSize.rows[0].masize;
        }
        
        for (const c of p.colors) {
          let maMau;
          const mauRes = await query("SELECT MaMau FROM mausac WHERE TenMau = $1", [c.name]);
          if (mauRes.rows.length > 0) maMau = mauRes.rows[0].mamau;
          else {
            const insertMau = await query("INSERT INTO mausac (TenMau, MaHex) VALUES ($1, $2) RETURNING MaMau", [c.name, c.hex]);
            maMau = insertMau.rows[0].mamau;
          }
          
          await query(
            "INSERT INTO bienthesanpham (MaSP, MaSize, MaMau, SoLuongTon, SKU) VALUES ($1, $2, $3, $4, $5)",
            [maSP, maSize, maMau, Math.max(1, Math.floor(p.totalStock / (p.sizes.length * p.colors.length))), `SKU-${maSP}-${s}-${c.name}`]
          );
        }
      }
    }
    
    console.log("TSV Seeding completed!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seedTSVToDB();
