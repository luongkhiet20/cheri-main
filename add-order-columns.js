import { getClient } from './db.js';
async function addColumns() {
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
    console.log('Columns added to donhang table successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}
addColumns();
