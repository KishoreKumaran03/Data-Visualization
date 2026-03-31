-- Clear all existing data from sales_summaries and projects
USE datavis_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all data
TRUNCATE TABLE sales_summaries;
TRUNCATE TABLE projects;
TRUNCATE TABLE seasonal_performance;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify tables are empty
SELECT COUNT(*) as sales_count FROM sales_summaries;
SELECT COUNT(*) as projects_count FROM projects;
SELECT COUNT(*) as users_count FROM users;
