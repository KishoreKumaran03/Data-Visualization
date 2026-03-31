CREATE DATABASE IF NOT EXISTS datavis_db;
USE datavis_db;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    position VARCHAR(255) DEFAULT 'Administrator',
    phone VARCHAR(64) DEFAULT NULL,
    profile_picture TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    store_type VARCHAR(255),
    store_segments JSON,
    branch_location_id VARCHAR(255),
    store_logo_url TEXT,
    currency_code VARCHAR(32),
    timezone VARCHAR(128),
    tax_identification_number VARCHAR(255),
    default_tax_rate DECIMAL(10, 2),
    low_stock_threshold INT,
    opening_balances JSON,
    owner_admin_email VARCHAR(255),
    contact_number VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    month_name VARCHAR(50) NOT NULL,
    year INT NOT NULL DEFAULT 2024,
    total_revenue DECIMAL(15, 2) NOT NULL,
    total_cost DECIMAL(15, 2) NOT NULL,
    net_revenue DECIMAL(15, 2) NOT NULL,
    total_quantity INT NOT NULL,
    top_product VARCHAR(255),
    top_region VARCHAR(255),
    insight TEXT,
    region_data JSON,
    category_data JSON,
    top_products JSON,
    detailed_entries JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (project_id, month_name, year),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasonal_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    quarter VARCHAR(10),
    avg_revenue DECIMAL(15, 2),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
