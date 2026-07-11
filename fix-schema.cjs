const { getClient } = require('./db.js');
async function fixSchema() {
  const client = await getClient();
  try {
    await client.query(`
      ALTER TABLE donhang
      ADD COLUMN IF NOT EXISTS dia_chi TEXT,
      ADD COLUMN IF NOT EXISTS sdt TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS ghi_chu TEXT,
      ADD COLUMN IF NOT EXISTS phuong_thuc_thanh_toan TEXT,
      ADD COLUMN IF NOT EXISTS phuong_thuc_van_chuyen TEXT,
      ADD COLUMN IF NOT EXISTS trang_thai_text TEXT;
    `);

    await client.query(`
      ALTER TABLE chitiet_donhang DROP CONSTRAINT IF EXISTS chitiet_donhang_pkey CASCADE;
      ALTER TABLE chitiet_donhang ALTER COLUMN MaBienThe DROP NOT NULL;
      
      ALTER TABLE chitiet_donhang
      ADD COLUMN IF NOT EXISTS ma_san_pham INT,
      ADD COLUMN IF NOT EXISTS ten_san_pham TEXT,
      ADD COLUMN IF NOT EXISTS gia FLOAT,
      ADD COLUMN IF NOT EXISTS size TEXT,
      ADD COLUMN IF NOT EXISTS mau_sac TEXT;
    `);
    console.log('Schema fixed!');
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}
fixSchema();
