-- FIXORA: SAMPLE DATA FOR YOUR EXISTING DATABASE (MySQL / MariaDB)
-- Select your Fixora database in your SQL client before running this file.
-- Replace the email below with the email you use to sign in to Fixora.
-- Run in ONE connection. Existing data is not updated or deleted.
-- Re-running for the same branch skips existing sample record IDs.
-- Requires the current schema, including suppliers.phones.
-- Items are global in the current app; other records use the user's company/branch.
-- IMPORTANT: This script does NOT auto-commit. Check the results, then run
-- COMMIT; in the SAME connection. On any error run ROLLBACK; instead.
-- Take a backup before adding these fictional records to your existing database.
-- This creates no new database and does not change existing application rows.
-- Previously inserted DEMO records are left untouched; this is a separate batch.

SET @sample_login_email = 'YOUR_LOGIN_EMAIL_HERE';

SET @sample_user_id = NULL;
SET @sample_company_id = NULL;
SET @sample_branch_id = NULL;

SELECT u.id, u.company_id, u.active_branch_id
INTO @sample_user_id, @sample_company_id, @sample_branch_id
FROM users u
JOIN companies c ON c.id = u.company_id AND c.is_active = 1
JOIN branches b ON b.id = u.active_branch_id
               AND b.company_id = u.company_id AND b.is_active = 1
WHERE u.email = @sample_login_email AND u.is_active = 1
LIMIT 1;

SET @sample_ready = (@sample_user_id IS NOT NULL AND @sample_branch_id IS NOT NULL);
SET @sample_hash = MD5(CONCAT('fixora-sample-v2:', @sample_branch_id));
SET @sample_tag = LEFT(@sample_hash, 8);
SET @sample_id_prefix = CONCAT(
  LEFT(@sample_hash, 8), '-', SUBSTRING(@sample_hash, 9, 4),
  '-4', SUBSTRING(@sample_hash, 13, 3),
  '-8', SUBSTRING(@sample_hash, 16, 3), '-'
);
SET @sample_now = NOW();

SELECT CASE WHEN @sample_ready THEN 'READY: check company and active branch below'
       ELSE 'STOP: no active user/company/branch matches this email. No sample rows will be inserted.'
       END AS setup_status,
       @sample_company_id AS company_id, @sample_branch_id AS active_branch_id;

-- Session-only sample definitions. These are not application tables.
DROP TEMPORARY TABLE IF EXISTS fixora_sample_catalog;
CREATE TEMPORARY TABLE fixora_sample_catalog (
  seq INT PRIMARY KEY,
  item_name VARCHAR(120) NOT NULL,
  sku_suffix VARCHAR(24) NOT NULL,
  stock_quantity INT NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  order_quantity INT NULL
);

INSERT INTO fixora_sample_catalog VALUES
  (1, 'iPhone 15 Display',       'IPH15-DIS',  0, 28000.00, 35000.00, 10),
  (2, 'MacBook Air M2 Battery',  'MACM2-BAT',  2, 18500.00, 24000.00,  8),
  (3, 'Samsung A54 Display',    'SA54-DIS',   3, 12000.00, 16500.00, 12),
  (4, 'USB-C Charging Port',    'USBC-PORT',  4,  1500.00,  2800.00, 20),
  (5, 'Laptop DDR4 8GB RAM',    'DDR4-8GB',  12,  5500.00,  7500.00, 10),
  (6, 'NVMe 512GB SSD',         'NVME-512',  20,  8500.00, 11500.00,  5),
  (7, 'Laptop Cooling Fan',     'LAP-FAN',    8,  2200.00,  3800.00, NULL),
  (8, 'Thermal Paste 4g',       'PASTE-4G',  15,   850.00,  1500.00, NULL);

START TRANSACTION;

-- 1. ITEMS: catalog only. Actual stock quantities live in stocks.
INSERT INTO items
  (id, name, sku, source, quantity, cost_price, selling_price, created_at, updated_at)
SELECT CONCAT(@sample_id_prefix, LPAD(d.seq, 12, '0')),
       d.item_name,
       CONCAT(d.sku_suffix, '-', @sample_tag),
       'catalog', 0, 0.00, 0.00, @sample_now, @sample_now
FROM fixora_sample_catalog d
WHERE @sample_ready AND NOT EXISTS (
  SELECT 1 FROM items existing
  WHERE existing.id = CONCAT(@sample_id_prefix, LPAD(d.seq, 12, '0'))
);

-- 2. STOCK STORE: four low-stock records (0, 2, 3, 4) and four healthy records.
INSERT INTO stocks
  (id, item_id, branch_id, name, sku, quantity, cost_price, selling_price, created_at, updated_at)
SELECT CONCAT(@sample_id_prefix, LPAD(100 + d.seq, 12, '0')),
       i.id, @sample_branch_id, i.name, i.sku, d.stock_quantity,
       d.cost_price, d.selling_price, @sample_now, @sample_now
FROM fixora_sample_catalog d
JOIN items i ON i.id = CONCAT(@sample_id_prefix, LPAD(d.seq, 12, '0'))
WHERE @sample_ready AND NOT EXISTS (
  SELECT 1 FROM stocks existing
  WHERE existing.id = CONCAT(@sample_id_prefix, LPAD(100 + d.seq, 12, '0'))
);

-- 3. SUPPLIERS: fictional contacts; .example addresses do not send real email.
-- An existing supplier with the same company/name is kept, not duplicated.
INSERT INTO suppliers
  (id, company_id, name, phones, email, address, is_active, created_at, updated_at)
SELECT CONCAT(@sample_id_prefix, LPAD(300 + d.seq, 12, '0')),
       @sample_company_id, d.supplier_name,
       d.phones, d.email, d.address, 1, @sample_now, @sample_now
FROM (
  SELECT 1 AS seq, 'Metro Mobile Parts' AS supplier_name,
    JSON_ARRAY('000-000-0101', '000-000-0102') AS phones,
    'sales@metro.example' AS email, '10 Sample Road, Colombo' AS address
  UNION ALL SELECT 2, 'Lanka Laptop Components', JSON_ARRAY('000-000-0201'),
    'quotes@laptop.example', '20 Sample Avenue, Kandy'
  UNION ALL SELECT 3, 'TechLine Wholesale', JSON_ARRAY('000-000-0301', '000-000-0302'),
    'sales@techline.example', '30 Test Street, Galle'
  UNION ALL SELECT 4, 'Island Electronics', JSON_ARRAY('000-000-0401'),
    'orders@island.example', '40 Sample Lane, Kurunegala'
  UNION ALL SELECT 5, 'QuickFix Supplies', JSON_ARRAY(),
    NULL, '50 Park Road, Matara'
) d
WHERE @sample_ready AND NOT EXISTS (
  SELECT 1 FROM suppliers existing
  WHERE existing.id = CONCAT(@sample_id_prefix, LPAD(300 + d.seq, 12, '0'))
     OR (existing.company_id = @sample_company_id AND existing.name = d.supplier_name)
);

-- 4. PURCHASE REQUESTS: six rows ready for printing or supplier quotations.
INSERT INTO stock_requests
  (id, item_id, branch_id, item_name, sku, quantity, note, status, requested_by, created_at, updated_at)
SELECT CONCAT(@sample_id_prefix, LPAD(200 + d.seq, 12, '0')),
       i.id, @sample_branch_id, i.name, i.sku, d.order_quantity,
       'Please provide a quotation with unit prices and delivery availability.', 'Pending', @sample_user_id,
       DATE_SUB(@sample_now, INTERVAL d.seq DAY), @sample_now
FROM fixora_sample_catalog d
JOIN items i ON i.id = CONCAT(@sample_id_prefix, LPAD(d.seq, 12, '0'))
WHERE @sample_ready AND d.order_quantity IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM stock_requests existing
  WHERE existing.id = CONCAT(@sample_id_prefix, LPAD(200 + d.seq, 12, '0'))
);

-- 5. REPAIR JOBS: six active jobs and two history records.
-- Customer/technician names are fictional; 000 phone numbers are placeholders.
-- No parts are assigned initially: add parts through the app to test stock deduction.
-- Stock quantities above are available quantities, not pre-repair quantities.
INSERT INTO repair_jobs
  (id, job_number, customer_name, customer_phone, asset_name, asset_type,
   asset_identifier, issue, status, technician, promised_date, priority,
   parts, created_by, branch_id, created_at, updated_at)
SELECT CONCAT(@sample_id_prefix, LPAD(400 + d.seq, 12, '0')),
       CONCAT('REP-', @sample_tag, '-', LPAD(d.seq, 3, '0')),
       CASE d.seq
         WHEN 1 THEN 'Nimal Perera' WHEN 2 THEN 'Kasuni Silva'
         WHEN 3 THEN 'Dinesh Fernando' WHEN 4 THEN 'Amali Jayasinghe'
         WHEN 5 THEN 'Ruwan Senanayake' WHEN 6 THEN 'Tharushi Dias'
         WHEN 7 THEN 'Chamath Wijesinghe' WHEN 8 THEN 'Nadeesha Kumari'
       END,
       CONCAT('000-000-', LPAD(1000 + d.seq, 4, '0')),
       d.asset_name, d.asset_type, CONCAT('ASSET-', @sample_tag, '-', d.seq),
       d.issue, d.status, d.technician,
       CASE WHEN d.seq >= 7 THEN DATE_SUB(@sample_now, INTERVAL 2 DAY)
            WHEN d.seq = 3 THEN DATE_SUB(@sample_now, INTERVAL 1 DAY)
            ELSE DATE_ADD(@sample_now, INTERVAL 3 DAY) END,
       d.priority, JSON_ARRAY(), @sample_user_id, @sample_branch_id,
       DATE_SUB(@sample_now, INTERVAL (d.seq + 2) DAY), @sample_now
FROM (
  SELECT 1 AS seq, 'iPhone 15' AS asset_name, 'Mobile & tablet' AS asset_type,
    'Screen cracked; inspect and provide an estimate.' AS issue,
    'Received' AS status, NULL AS technician, 'Normal' AS priority
  UNION ALL SELECT 2, 'MacBook Air M2', 'Laptop & computer',
    'Battery drains quickly; run battery diagnostics.', 'Diagnosis', 'Sahan', 'High'
  UNION ALL SELECT 3, 'Samsung Galaxy A54', 'Mobile & tablet',
    'Display replacement required; awaiting supplier stock.', 'Waiting for parts', 'Lahiru', 'Urgent'
  UNION ALL SELECT 4, 'Dell Latitude 5420', 'Laptop & computer',
    'Slow startup; RAM and SSD upgrade requested.', 'In progress', 'Sahan', 'Normal'
  UNION ALL SELECT 5, 'HP ProBook 450', 'Laptop & computer',
    'Cooling fan noise; inspect temperature and fan operation.', 'Quality check', 'Lahiru', 'High'
  UNION ALL SELECT 6, 'Lenovo ThinkPad T14', 'Laptop & computer',
    'Software service completed; customer notified.', 'Ready for collection', 'Sahan', 'Normal'
  UNION ALL SELECT 7, 'iPad Air', 'Mobile & tablet',
    'Software restore completed and device delivered. No parts used.', 'Delivered', 'Lahiru', 'Normal'
  UNION ALL SELECT 8, 'Asus VivoBook 15', 'Laptop & computer',
    'Diagnostic and software service completed. No parts used.', 'Closed', 'Sahan', 'Normal'
) d
WHERE @sample_ready AND NOT EXISTS (
  SELECT 1 FROM repair_jobs existing
  WHERE existing.id = CONCAT(@sample_id_prefix, LPAD(400 + d.seq, 12, '0'))
);

-- Verify before committing. A fresh batch normally adds 8 / 8 / 5 / 6 / 8.
-- Supplier count can be lower when matching names already exist in your company.
-- On later runs, records already edited in the app are left untouched.
SELECT 'Items' AS record_type, COUNT(*) AS sample_count
FROM items WHERE id LIKE CONCAT(@sample_id_prefix, '%')
UNION ALL SELECT 'Stock store', COUNT(*)
FROM stocks WHERE branch_id = @sample_branch_id AND id LIKE CONCAT(@sample_id_prefix, '%')
UNION ALL SELECT 'Suppliers', COUNT(*)
FROM suppliers WHERE company_id = @sample_company_id AND id LIKE CONCAT(@sample_id_prefix, '%')
UNION ALL SELECT 'Purchase requests', COUNT(*)
FROM stock_requests WHERE branch_id = @sample_branch_id AND id LIKE CONCAT(@sample_id_prefix, '%')
UNION ALL SELECT 'Repair jobs (6 active + 2 history)', COUNT(*)
FROM repair_jobs WHERE branch_id = @sample_branch_id AND id LIKE CONCAT(@sample_id_prefix, '%');

-- If there were NO errors and the counts/target branch are correct, run:
-- COMMIT;
-- If anything failed or the target is wrong, run instead:
-- ROLLBACK;
