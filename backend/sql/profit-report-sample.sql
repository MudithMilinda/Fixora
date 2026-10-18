-- FIXORA PROFIT REPORT: FICTIONAL SAMPLE DATA (MySQL / MariaDB)
-- 1. Restart the backend first so sales, received_at and cost_currency exist.
-- 2. Select your existing Fixora database in your SQL client.
-- 3. Set your login email below. All rows use that user's current branch.
-- 4. Run this entire script in ONE phpMyAdmin SQL request. It commits at the end.
--    Check your email and selected database BEFORE running it.
-- This adds financial test records. Back up the database before inserting.
-- Re-running the script for the same branch skips these sample records.
-- No existing rows are modified. This script does not create a database.

SET @profit_sample_email = 'YOUR_LOGIN_EMAIL_HERE';
SET @profit_user_id = NULL;
SET @profit_company_id = NULL;
SET @profit_branch_id = NULL;

SELECT u.id, u.company_id, u.active_branch_id
INTO @profit_user_id, @profit_company_id, @profit_branch_id
FROM users u
JOIN companies c ON c.id = u.company_id AND c.is_active = 1
JOIN branches b ON b.id = u.active_branch_id AND b.company_id = u.company_id AND b.is_active = 1
JOIN user_branches ub ON ub.user_id = u.id AND ub.branch_id = b.id
WHERE u.email = @profit_sample_email AND u.is_active = 1
LIMIT 1;

SET @profit_ready = (@profit_user_id IS NOT NULL AND @profit_company_id IS NOT NULL AND @profit_branch_id IS NOT NULL);
SET @profit_hash = MD5(CONCAT('fixora-profit-demo-v1:', COALESCE(@profit_branch_id, 'no-branch')));
SET @profit_prefix = CONCAT(LEFT(@profit_hash, 8), '-', SUBSTRING(@profit_hash, 9, 4), '-4', SUBSTRING(@profit_hash, 13, 3), '-8', SUBSTRING(@profit_hash, 16, 3), '-');
SET @profit_tag = LEFT(@profit_hash, 8);
SET @profit_now = UTC_TIMESTAMP();
SET @profit_supplier = CONCAT(@profit_prefix, '000000000001');
SET @profit_quotation = CONCAT(@profit_prefix, '000000000002');
SET @profit_order = CONCAT(@profit_prefix, '000000000003');
SET @profit_stock = CONCAT(@profit_prefix, '000000000004');
SET @profit_sale_a = CONCAT(@profit_prefix, '000000000005');
SET @profit_sale_b = CONCAT(@profit_prefix, '000000000006');
SET @profit_request_a = CONCAT(@profit_prefix, '000000000007');
SET @profit_request_b = CONCAT(@profit_prefix, '000000000008');
SET @profit_item = CONCAT(@profit_prefix, '000000000009');
SET @profit_line_request = CONCAT(@profit_prefix, '000000000010');

SELECT CASE WHEN @profit_ready THEN 'READY: data will be committed for this company and branch'
  ELSE 'STOP: user, company, active branch or branch access not found; no rows will be inserted' END AS setup_status,
  @profit_company_id AS company_id, @profit_branch_id AS active_branch_id;

START TRANSACTION;

INSERT INTO items (id, name, sku, source, quantity, cost_price, selling_price, created_at, updated_at)
SELECT @profit_item, 'DEMO - USB-C charging port', CONCAT('DEMO-PROFIT-', @profit_tag), 'catalog', 0, 0, 0, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM items WHERE id = @profit_item);

INSERT INTO suppliers (id, company_id, name, phones, email, address, is_active, created_at, updated_at)
SELECT @profit_supplier, @profit_company_id, CONCAT('DEMO Profit Supplier ', @profit_tag), JSON_ARRAY(), 'profit-demo@example.com', 'Fictional sample supplier', 1, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM suppliers WHERE id = @profit_supplier);

-- Purchased 10 units at LKR 1,000.00 each. This is a fictional receipt.
SET @profit_order_items = JSON_ARRAY(JSON_OBJECT(
  'requestId', @profit_line_request, 'itemId', @profit_item, 'itemName', 'DEMO - USB-C charging port',
  'sku', CONCAT('DEMO-PROFIT-', @profit_tag), 'quantity', 10, 'unitPriceCents', 100000, 'lineTotalCents', 1000000));

INSERT INTO quotations (id, company_id, branch_id, supplier_id, supplier_name, quotation_number, quotation_date, currency, items, total_cents, status, approved_by, approved_at, created_by, created_at, updated_at)
SELECT @profit_quotation, @profit_company_id, @profit_branch_id, @profit_supplier, CONCAT('DEMO Profit Supplier ', @profit_tag), CONCAT('DEMO-Q-', @profit_tag), UTC_DATE(), 'LKR', @profit_order_items, 1000000, 'Approved', @profit_user_id, @profit_now, @profit_user_id, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM quotations WHERE id = @profit_quotation);

INSERT INTO purchase_orders (id, company_id, branch_id, quotation_id, order_number, supplier_id, supplier_name, currency, items, total_cents, status, received_at, created_by, created_at, updated_at)
SELECT @profit_order, @profit_company_id, @profit_branch_id, @profit_quotation, CONCAT('DEMO-PO-', @profit_tag), @profit_supplier, CONCAT('DEMO Profit Supplier ', @profit_tag), 'LKR', @profit_order_items, 1000000, 'Received', @profit_now, @profit_user_id, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = @profit_order);

-- Three units have already been sold; seven units remain in stock.
INSERT INTO stocks (id, item_id, branch_id, name, sku, quantity, cost_currency, cost_price, selling_price, created_at, updated_at)
SELECT @profit_stock, @profit_item, @profit_branch_id, 'DEMO - USB-C charging port', CONCAT('DEMO-PROFIT-', @profit_tag), 7, 'LKR', 1000.00, 1500.00, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM stocks WHERE id = @profit_stock);

-- Sale A: 2 x 1,500 = 3,000. Sale B: 1 x 1,500 = 1,500.
INSERT INTO sales (id, request_id, company_id, branch_id, created_by, repair_id, customer_name, customer_phone, subtotal_cents, discount_cents, total_cents, `lines`, `payments`, `repair`, created_at, updated_at)
SELECT @profit_sale_a, @profit_request_a, @profit_company_id, @profit_branch_id, @profit_user_id, NULL, 'DEMO Customer A', '', 300000, 0, 300000,
  JSON_ARRAY(JSON_OBJECT('name', 'DEMO - USB-C charging port', 'sku', CONCAT('DEMO-PROFIT-', @profit_tag), 'quantity', 2, 'unitPrice', 1500, 'unitCostCents', 100000, 'type', 'stock')),
  JSON_ARRAY(JSON_OBJECT('method', 'Cash', 'amount', 3000)), NULL, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM sales WHERE id = @profit_sale_a);

INSERT INTO sales (id, request_id, company_id, branch_id, created_by, repair_id, customer_name, customer_phone, subtotal_cents, discount_cents, total_cents, `lines`, `payments`, `repair`, created_at, updated_at)
SELECT @profit_sale_b, @profit_request_b, @profit_company_id, @profit_branch_id, @profit_user_id, NULL, 'DEMO Customer B', '', 150000, 0, 150000,
  JSON_ARRAY(JSON_OBJECT('name', 'DEMO - USB-C charging port', 'sku', CONCAT('DEMO-PROFIT-', @profit_tag), 'quantity', 1, 'unitPrice', 1500, 'unitCostCents', 100000, 'type', 'stock')),
  JSON_ARRAY(JSON_OBJECT('method', 'Cash', 'amount', 1500)), NULL, @profit_now, @profit_now
WHERE @profit_ready AND NOT EXISTS (SELECT 1 FROM sales WHERE id = @profit_sale_b);

SELECT 'Demo stock' AS record_type, COUNT(*) AS sample_count FROM stocks WHERE id = @profit_stock AND branch_id = @profit_branch_id
UNION ALL SELECT 'Demo received order', COUNT(*) FROM purchase_orders WHERE id = @profit_order AND branch_id = @profit_branch_id
UNION ALL SELECT 'Demo sales', COUNT(*) FROM sales WHERE id IN (@profit_sale_a, @profit_sale_b) AND branch_id = @profit_branch_id;

-- Expected SAMPLE contribution to today's report in the user's local time:
-- Purchases: LKR 10,000.00; sales: LKR 4,500.00; sold cost: LKR 3,000.00;
-- gross profit: LKR 1,500.00; current remaining stock value: LKR 7,000.00.
-- Existing branch records also affect the report; missing cost snapshots can
-- make its overall gross profit unavailable. UTC timestamps are used by the app.
-- Commit within this SQL request: phpMyAdmin may use a new connection for
-- the next request, which would otherwise roll the transaction back.
COMMIT;
