const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { execFile } = require('child_process');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stateAliases = require('./state_aliases.json');

const stateLookup = Object.entries(stateAliases).reduce((lookup, [canonicalName, aliases]) => {
  [canonicalName, ...aliases].forEach((alias) => {
    const normalizedAlias = String(alias).toLowerCase().replace(/[^a-z0-9]/g, '');
    lookup[normalizedAlias] = canonicalName;
  });
  return lookup;
}, {});

function normalizeIndianState(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (stateLookup[normalizedText]) {
    return stateLookup[normalizedText];
  }

  const matchedEntry = Object.entries(stateLookup).find(([aliasKey]) =>
    normalizedText === aliasKey || normalizedText.includes(aliasKey) || aliasKey.includes(normalizedText)
  );

  return matchedEntry ? matchedEntry[1] : text;
}

function normalizeStateRevenueMap(rawData) {
  return Object.entries(rawData || {}).reduce((normalizedData, [region, value]) => {
    const normalizedState = normalizeIndianState(region);
    if (!normalizedState) {
      return normalizedData;
    }

    normalizedData[normalizedState] = (normalizedData[normalizedState] || 0) + Number(value || 0);
    return normalizedData;
  }, {});
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'datavis_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({ storage });
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-123-analytics';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

async function ensureSchema() {
  const connection = await pool.getConnection();

  try {
    // Ensure users table has all required columns
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    const userColumnNames = new Set(userColumns.map((c) => c.COLUMN_NAME));

    if (!userColumnNames.has('position')) {
      await connection.query("ALTER TABLE users ADD COLUMN position VARCHAR(255) DEFAULT 'Administrator'");
    }
    if (!userColumnNames.has('phone')) {
      await connection.query('ALTER TABLE users ADD COLUMN phone VARCHAR(64) DEFAULT NULL');
    }
    if (!userColumnNames.has('profile_picture')) {
      await connection.query('ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT NULL');
    }

    const [projectColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'
    `);
    const projectColumnNames = new Set(projectColumns.map((column) => column.COLUMN_NAME));

    if (!projectColumnNames.has('user_id')) {
      await connection.query('ALTER TABLE projects ADD COLUMN user_id INT NULL AFTER id');
      const [[firstUser]] = await connection.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
      if (firstUser?.id) {
        await connection.query('UPDATE projects SET user_id = ? WHERE user_id IS NULL', [firstUser.id]);
      }
      await connection.query('ALTER TABLE projects MODIFY COLUMN user_id INT NOT NULL');
    }

    const [projectForeignKeys] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (projectForeignKeys.length === 0) {
      await connection.query('ALTER TABLE projects ADD CONSTRAINT fk_projects_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    }

    const projectColumnDefinitions = [
      ['store_type', 'ALTER TABLE projects ADD COLUMN store_type VARCHAR(255) NULL AFTER name'],
      ['store_segments', 'ALTER TABLE projects ADD COLUMN store_segments JSON NULL AFTER store_type'],
      ['branch_location_id', 'ALTER TABLE projects ADD COLUMN branch_location_id VARCHAR(255) NULL AFTER store_segments'],
      ['store_logo_url', 'ALTER TABLE projects ADD COLUMN store_logo_url TEXT NULL AFTER branch_location_id'],
      ['currency_code', 'ALTER TABLE projects ADD COLUMN currency_code VARCHAR(32) NULL AFTER store_logo_url'],
      ['timezone', 'ALTER TABLE projects ADD COLUMN timezone VARCHAR(128) NULL AFTER currency_code'],
      ['tax_identification_number', 'ALTER TABLE projects ADD COLUMN tax_identification_number VARCHAR(255) NULL AFTER timezone'],
      ['default_tax_rate', 'ALTER TABLE projects ADD COLUMN default_tax_rate DECIMAL(10, 2) NULL AFTER tax_identification_number'],
      ['low_stock_threshold', 'ALTER TABLE projects ADD COLUMN low_stock_threshold INT NULL AFTER default_tax_rate'],
      ['opening_balances', 'ALTER TABLE projects ADD COLUMN opening_balances JSON NULL AFTER low_stock_threshold'],
      ['owner_admin_email', 'ALTER TABLE projects ADD COLUMN owner_admin_email VARCHAR(255) NULL AFTER opening_balances'],
      ['contact_number', 'ALTER TABLE projects ADD COLUMN contact_number VARCHAR(64) NULL AFTER owner_admin_email']
    ];

    for (const [columnName, query] of projectColumnDefinitions) {
      if (!projectColumnNames.has(columnName)) {
        await connection.query(query);
      }
    }

    const [salesSummaryColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_summaries'
    `);
    const salesSummaryColumnNames = new Set(salesSummaryColumns.map((column) => column.COLUMN_NAME));
    if (!salesSummaryColumnNames.has('detailed_entries')) {
      await connection.query('ALTER TABLE sales_summaries ADD COLUMN detailed_entries JSON NULL AFTER top_products');
    }
  } finally {
    connection.release();
  }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API Endpoints
app.get('/', (req, res) => {
  res.send('Analytics Platform Auth & Data API');
});

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, position, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await pool.execute(
      'INSERT INTO users (name, email, password, position, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, position || 'Administrator', phone || null]
    );
    res.json({ message: 'User registered successfully', userId: rows.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        position: user.position,
        profile_picture: user.profile_picture,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Excel endpoint
app.post('/api/upload', upload.single('file'), authenticateToken, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { project_id, month, year } = req.body;
  const userId = req.user.userId;
  const filePath = req.file.path;
  const targetYear = year || 2024;

  // Trigger Python script
  const pythonScript = path.join(__dirname, 'scripts', 'process_excel.py');
  const pythonCommand = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const pythonArgs = [pythonScript, filePath, project_id, month, targetYear, String(userId)];

  execFile(pythonCommand, pythonArgs, async (error, stdout, stderr) => {
    console.log(`Python Command: ${pythonCommand} ${pythonArgs.join(' ')}`);
    if (error) {
      console.error(`Exec Error: ${error.message}`);
      return res.status(500).json({ error: 'Data processing failed', details: error.message });
    }
    if (stderr) {
      console.error(`Python Stderr: ${stderr}`);
    }

    console.log(`Python Stdout: ${stdout}`);
    try {
      const result = JSON.parse(stdout);
      if (result.error) {
        return res.status(400).json({ error: result.error, columns: result.columns_found });
      }
      res.json({ message: 'Data processed successfully', data: result });
    } catch (e) {
      console.error(`JSON Parse Error: ${e.message}. Raw output: ${stdout}`);
      res.status(500).json({ error: 'Invalid output from processing script', raw: stdout });
    }
  });
});

// Get all projects for logged-in user
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM projects WHERE user_id = ?', [req.user.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  const {
    name,
    store_type,
    store_segments,
    branch_location_id,
    store_logo_url,
    currency_code,
    timezone,
    tax_identification_number,
    default_tax_rate,
    low_stock_threshold,
    opening_balances,
    owner_admin_email,
    contact_number,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO projects (
        user_id, name, store_type, store_segments, branch_location_id, store_logo_url, currency_code,
        timezone, tax_identification_number, default_tax_rate, low_stock_threshold, opening_balances,
        owner_admin_email, contact_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        String(name).trim(),
        store_type || null,
        store_segments ? JSON.stringify(store_segments) : null,
        branch_location_id || null,
        store_logo_url || null,
        currency_code || null,
        timezone || null,
        tax_identification_number || null,
        default_tax_rate !== '' && default_tax_rate !== undefined && default_tax_rate !== null ? Number(default_tax_rate) : null,
        low_stock_threshold !== '' && low_stock_threshold !== undefined && low_stock_threshold !== null ? Number(low_stock_threshold) : null,
        opening_balances ? JSON.stringify(opening_balances) : null,
        owner_admin_email || null,
        contact_number || null,
      ]
    );

    const [[createdProject]] = await pool.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json(createdProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:projectId/logo', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { store_logo_url } = req.body || {};

  if (!store_logo_url || typeof store_logo_url !== 'string') {
    return res.status(400).json({ error: 'store_logo_url is required' });
  }

  try {
    const [projectRows] = await pool.execute('SELECT id, user_id FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectRows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.execute('UPDATE projects SET store_logo_url = ? WHERE id = ?', [store_logo_url, projectId]);
    const [[updatedProject]] = await pool.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const {
    name,
    store_type,
    store_segments,
    branch_location_id,
    store_logo_url,
    currency_code,
    timezone,
    tax_identification_number,
    default_tax_rate,
    low_stock_threshold,
    opening_balances,
    owner_admin_email,
    contact_number,
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  try {
    const [projectRows] = await pool.execute('SELECT id, user_id FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectRows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.execute(
      `UPDATE projects SET
        name = ?,
        store_type = ?,
        store_segments = ?,
        branch_location_id = ?,
        store_logo_url = ?,
        currency_code = ?,
        timezone = ?,
        tax_identification_number = ?,
        default_tax_rate = ?,
        low_stock_threshold = ?,
        opening_balances = ?,
        owner_admin_email = ?,
        contact_number = ?
      WHERE id = ?`,
      [
        String(name).trim(),
        store_type || null,
        store_segments ? JSON.stringify(store_segments) : null,
        branch_location_id || null,
        store_logo_url || null,
        currency_code || null,
        timezone || null,
        tax_identification_number || null,
        default_tax_rate !== '' && default_tax_rate !== undefined && default_tax_rate !== null ? Number(default_tax_rate) : null,
        low_stock_threshold !== '' && low_stock_threshold !== undefined && low_stock_threshold !== null ? Number(low_stock_threshold) : null,
        opening_balances ? JSON.stringify(opening_balances) : null,
        owner_admin_email || null,
        contact_number || null,
        projectId,
      ]
    );

    const [[updatedProject]] = await pool.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get global summary for dashboard
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  const year = req.query.year || 2024;
  try {
    const [rows] = await pool.execute(`
      SELECT 
        SUM(total_revenue) as total_revenue,
        SUM(total_cost) as total_cost,
        SUM(net_revenue) as net_revenue,
        SUM(total_quantity) as total_quantity,
        COUNT(DISTINCT project_id) as project_count
      FROM sales_summaries ss
      JOIN projects p ON ss.project_id = p.id
      WHERE p.user_id = ? AND ss.year = ?
    `, [req.user.userId, year]);
    
    // Get revenue trend (grouped by month across all projects) for that year
    const [trend] = await pool.execute(`
      SELECT month_name, SUM(total_revenue) as total_revenue, SUM(net_revenue) as net_revenue
      FROM sales_summaries ss
      JOIN projects p ON ss.project_id = p.id
      WHERE p.user_id = ? AND ss.year = ?
      GROUP BY month_name
      ORDER BY FIELD(month_name, 'January', 'February', 'March', 'April', 'May', 'June', 
                                 'July', 'August', 'September', 'October', 'November', 'December')
    `, [req.user.userId, year]);

    // Get aggregated region data
    const [regionRows] = await pool.execute(`
      SELECT region_data FROM sales_summaries ss
      JOIN projects p ON ss.project_id = p.id
      WHERE p.user_id = ? AND ss.year = ?
    `, [req.user.userId, year]);

    let aggregatedRegionData = {};
    regionRows.forEach(row => {
      if (row.region_data) {
        try {
          const regionData = typeof row.region_data === 'string' ? JSON.parse(row.region_data) : row.region_data;
          const normalizedRegionData = normalizeStateRevenueMap(regionData);
          Object.entries(normalizedRegionData).forEach(([region, value]) => {
            aggregatedRegionData[region] = (aggregatedRegionData[region] || 0) + value;
          });
        } catch (e) {
          console.error('Error parsing region_data:', e);
        }
      }
    });

    // Get aggregated category data
    const [categoryRows] = await pool.execute(`
      SELECT category_data FROM sales_summaries ss
      JOIN projects p ON ss.project_id = p.id
      WHERE p.user_id = ? AND ss.year = ?
    `, [req.user.userId, year]);

    let aggregatedCategoryData = {};
    categoryRows.forEach(row => {
      if (row.category_data) {
        try {
          const categoryData = typeof row.category_data === 'string' ? JSON.parse(row.category_data) : row.category_data;
          Object.entries(categoryData).forEach(([category, value]) => {
            aggregatedCategoryData[category] = (aggregatedCategoryData[category] || 0) + value;
          });
        } catch (e) {
          console.error('Error parsing category_data:', e);
        }
      }
    });

    // Get aggregated product data
    const [productRows] = await pool.execute(`
      SELECT top_products FROM sales_summaries ss
      JOIN projects p ON ss.project_id = p.id
      WHERE p.user_id = ? AND ss.year = ?
    `, [req.user.userId, year]);

    let aggregatedProductData = {};
    productRows.forEach(row => {
      if (row.top_products) {
        try {
          const productData = typeof row.top_products === 'string' ? JSON.parse(row.top_products) : row.top_products;
          Object.entries(productData || {}).forEach(([product, value]) => {
            aggregatedProductData[product] = (aggregatedProductData[product] || 0) + Number(value || 0);
          });
        } catch (e) {
          console.error('Error parsing top_products:', e);
        }
      }
    });

    res.json({ 
      stats: rows[0], 
      trend,
      region_data: aggregatedRegionData,
      state_data: aggregatedRegionData,
      category_data: aggregatedCategoryData,
      product_data: aggregatedProductData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Dashboard Data for specific project
app.get('/api/dashboard/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Verify user owns this project
    const [project] = await pool.execute('SELECT user_id FROM projects WHERE id = ?', [projectId]);
    if (project.length === 0 || project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [rows] = await pool.execute(
      `SELECT id, project_id, month_name, year, total_revenue, total_cost, net_revenue, 
              total_quantity, region_data, category_data, top_product, top_region, insight, top_products, detailed_entries
       FROM sales_summaries WHERE project_id = ? ORDER BY year DESC, 
       FIELD(month_name, 'January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December')`,
      [projectId]
    );
    
    // Parse JSON fields
    const processedRows = rows.map(row => ({
      ...row,
      region_data: normalizeStateRevenueMap(typeof row.region_data === 'string' ? JSON.parse(row.region_data) : row.region_data),
      category_data: typeof row.category_data === 'string' ? JSON.parse(row.category_data) : row.category_data,
      top_products: typeof row.top_products === 'string' ? JSON.parse(row.top_products) : row.top_products,
      detailed_entries: typeof row.detailed_entries === 'string' ? JSON.parse(row.detailed_entries) : row.detailed_entries
    }));
    
    res.json(processedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all records for a project
app.delete('/api/dashboard/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Verify user owns this project
    const [project] = await pool.execute('SELECT user_id FROM projects WHERE id = ?', [projectId]);
    if (project.length === 0 || project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.execute('DELETE FROM sales_summaries WHERE project_id = ?', [projectId]);
    res.json({ message: 'All data for this store has been cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all imported records for the authenticated user across every project
app.delete('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `DELETE ss
       FROM sales_summaries ss
       INNER JOIN projects p ON p.id = ss.project_id
       WHERE p.user_id = ?`,
      [req.user.userId]
    );

    res.json({
      message: 'All imported analytics data has been cleared.',
      deleted_rows: result.affectedRows || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile with stores owned
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.execute(
      'SELECT id, name, email, position, profile_picture, phone, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [projects] = await pool.execute(
      'SELECT id, name, store_type, branch_location_id, created_at FROM projects WHERE user_id = ?',
      [req.user.userId]
    );

    res.json({
      user: userRows[0],
      stores: projects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { name, email, position, profile_picture, phone } = req.body;

  try {
    await pool.execute(
      'UPDATE users SET name = ?, email = ?, position = ?, profile_picture = ?, phone = ? WHERE id = ?',
      [name, email, position, profile_picture, phone, req.user.userId]
    );

    const [userRows] = await pool.execute(
      'SELECT id, name, email, position, profile_picture, phone FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({ user: userRows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get notifications/alerts for user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = [];

    // Check for low stock alerts
    const [lowStockProjects] = await pool.execute(`
      SELECT p.name, p.low_stock_threshold, ss.total_quantity, ss.month_name, ss.year
      FROM projects p
      LEFT JOIN sales_summaries ss ON p.id = ss.project_id
      WHERE p.user_id = ? AND p.low_stock_threshold IS NOT NULL
      ORDER BY ss.year DESC, ss.created_at DESC
      LIMIT 10
    `, [userId]);

    lowStockProjects.forEach(project => {
      if (project.low_stock_threshold && project.total_quantity <= project.low_stock_threshold) {
        notifications.push({
          id: `low_stock_${project.name}_${project.month_name}_${project.year}`,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${project.name} has low stock (${project.total_quantity} items) for ${project.month_name} ${project.year}`,
          severity: 'warning',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Check for declining sales (compare current month with previous month)
    const [salesTrend] = await pool.execute(`
      SELECT p.name, ss.month_name, ss.year, ss.total_revenue,
             LAG(ss.total_revenue) OVER (PARTITION BY p.id ORDER BY ss.year, FIELD(ss.month_name, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')) as prev_revenue
      FROM projects p
      JOIN sales_summaries ss ON p.id = ss.project_id
      WHERE p.user_id = ?
      ORDER BY p.id, ss.year DESC, FIELD(ss.month_name, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December') DESC
    `, [userId]);

    salesTrend.forEach(trend => {
      if (trend.prev_revenue && trend.total_revenue < trend.prev_revenue * 0.9) { // 10% decline
        const declinePercent = Math.round((1 - trend.total_revenue / trend.prev_revenue) * 100);
        notifications.push({
          id: `declining_sales_${trend.name}_${trend.month_name}_${trend.year}`,
          type: 'declining_sales',
          title: 'Declining Sales Alert',
          message: `${trend.name} sales dropped ${declinePercent}% in ${trend.month_name} ${trend.year}`,
          severity: 'error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Show mock business news only when the user has at least one imported summary row.
    const hasImportedData =
      lowStockProjects.some((project) => project.total_quantity !== null && project.total_quantity !== undefined) ||
      salesTrend.length > 0;

    if (hasImportedData) {
      const mockThreats = [
        {
          id: 'market_threat_1',
          type: 'market_threat',
          title: 'Market Competition Alert',
          message: 'New competitor entering your region with similar product offerings',
          severity: 'info',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'business_news_1',
          type: 'business_news',
          title: 'Industry Regulation Update',
          message: 'New tax regulations may affect your business operations starting next quarter',
          severity: 'warning',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      notifications.push(...mockThreats);
    }

    // Sort by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get business news and analysis (mock data - in real app would integrate with news APIs)
app.get('/api/business-news', authenticateToken, async (req, res) => {
  try {
    // Mock business news data - in a real application, this would fetch from news APIs
    const businessNews = [
      {
        id: 'news_1',
        title: 'Retail Sector Growth Forecast',
        summary: 'Industry analysts predict 15% growth in retail sector for Q4 2024',
        source: 'Business Today',
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        category: 'forecast',
        impact: 'positive'
      },
      {
        id: 'news_2',
        title: 'Supply Chain Disruptions Expected',
        summary: 'Global supply chain issues may cause product shortages in coming months',
        source: 'Economic Times',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        category: 'threat',
        impact: 'negative'
      },
      {
        id: 'news_3',
        title: 'Digital Transformation Trends',
        summary: 'Small businesses adopting digital tools see 25% increase in efficiency',
        source: 'TechCrunch',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        category: 'opportunity',
        impact: 'positive'
      }
    ];

    res.json({ news: businessNews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ensureSchema()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Backend listening at http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to ensure database schema:', error);
    process.exit(1);
  });
