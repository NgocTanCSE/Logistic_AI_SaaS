SELECT 'subscription_plans' as tbl, COUNT(*) as cnt FROM subscription_plans
UNION ALL SELECT 'tenants', COUNT(*) FROM tenants
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'order_tracking_events', COUNT(*) FROM order_tracking_events
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'trips', COUNT(*) FROM trips
UNION ALL SELECT 'trip_stops', COUNT(*) FROM trip_stops
UNION ALL SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'categories', COUNT(*) FROM categories;
