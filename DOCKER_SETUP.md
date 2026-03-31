# Docker Setup & Data Import Guide

## Prerequisites
- Docker Desktop installed and running
- Project directory ready with all files

## Quick Start - Run Everything with Docker

### 1. Start All Services
```bash
cd "c:\Users\Kishore Kumaran V S\Practice Projects\Data Visualization"
docker-compose up -d
```

This will start:
- **MySQL Database** → `localhost:3306`
- **Backend API** → `http://localhost:8001`
- **Frontend** → `http://localhost:3000`

### 2. Verify All Services Are Running
```bash
docker-compose ps
```

You should see 3 containers running: `datavis_db`, `datavis_api`, `datavis_frontend`

---

## How to Use the Application

### 1. **Access the Dashboard**
Open your browser and go to:
```
http://localhost:3000
```

### 2. **Login / Register**
- Create a new account or use existing credentials
- The database initializes automatically with the schema from `init_db.sql`

### 3. **Import Data**

#### Option A: Use the UI (Recommended)
1. Click **"Import Data"** button in the header
2. Select **Month** and **Year** from the dropdown
3. Click **"Continue"**
4. Choose your Excel/CSV file to upload
5. Data will be processed and displayed automatically

#### Option B: Example Data Format
Your Excel file should have these columns:
```
date | category | region | revenue | quantity | cost
```

Example:
```
2024-01-15 | Electronics | Maharashtra | 50000 | 10 | 25000
2024-01-16 | Furniture | Karnataka | 30000 | 5 | 15000
2024-01-17 | Others | Tamil Nadu | 20000 | 8 | 10000
```

---

## Dashboard Features

### 📊 **Global Dashboard** (`/`)
- **KPI Stats**: Revenue, Market Hubs, Global Users, Growth Index
- **Revenue & Profit Trend**: Interactive chart showing monthly trends
- **India Market Hubs**: Map visualization with active nodes
- **Category Split**: Donut chart showing market distribution
- **Vertical Performance**: Bar charts for business units

### 🏪 **Managed Stores** (`/projects`)
- List of all imported store/project data
- Click any store to view detailed analytics

### 📈 **Store Intelligence** (`/analytics/:projectId`)
- Regional velocity (pie chart)
- Revenue growth over time (bar chart)
- **Discard Hub Records** button to clear all data for that store

---

## Data Visualization Pipeline

### Flow: Import → Process → Display

```
Excel File
    ↓
[Upload via UI or API]
    ↓
Backend: Python Script (process_excel.py)
    ↓
Validates & Transforms Data
    ↓
Stores in MySQL Database
    ↓
Frontend Queries via API
    ↓
Charts & Visualizations Update Automatically
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login user

### Data Import
- `POST /api/upload` - Upload and process Excel file
- Payload:
  ```json
  {
    "project_id": "1",
    "month": "January",
    "year": "2024"
  }
  ```

### Dashboards
- `GET /api/projects` - List all stores/projects
- `GET /api/dashboard/summary?year=2024` - Global dashboard data
- `GET /api/dashboard/:projectId` - Store-specific data
- `DELETE /api/dashboard/:projectId` - Discard all data for store

---

## Manage Docker Services

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f db
```

### Stop Services
```bash
docker-compose down
```

### Stop & Remove Volumes (Reset Database)
```bash
docker-compose down -v
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Access Docker Container Terminal
```bash
# Backend
docker exec -it datavis_api bash

# Frontend
docker exec -it datavis_frontend bash

# Database
docker exec -it datavis_db mysql -u user -p datavis_db
# Password: password
```

---

## Troubleshooting

### "Connection refused" when accessing localhost:3000
- Ensure Docker Desktop is running
- Wait 10-15 seconds for all services to start
- Run `docker-compose ps` to verify all containers

### Database connection errors
- Check if MySQL container is healthy: `docker-compose ps`
- If not healthy, run: `docker-compose restart db`
- Wait 5 seconds, then try again

### Data not showing after import
- Check backend logs: `docker-compose logs api`
- Verify file format matches expected columns
- Check if data was inserted: Access MySQL directly or view in phpmyadmin

### Port already in use
```bash
# Stop other applications using ports 3000, 8001, or 3306
# Or change ports in docker-compose.yml
```

---

## Environment Variables

Currently configured in `docker-compose.yml`. To customize, edit:

```yaml
environment:
  - DB_HOST=db
  - DB_USER=user
  - DB_PASSWORD=password
  - DB_NAME=datavis_db
  - JWT_SECRET=secret-key-123-analytics
```

---

## File Structure
```
Project Root/
├── docker-compose.yml          # Docker orchestration
├── frontend/
│   ├── Dockerfile              # Frontend container setup
│   ├── vite.config.js          # Development server config
│   ├── package.json            # Dependencies
│   └── src/
│       └── App.jsx             # Main React component
├── backend/
│   ├── Dockerfile              # Backend container setup
│   ├── index.js                # Express API server
│   ├── init_db.sql             # Database schema
│   ├── package.json            # Dependencies
│   ├── requirements.txt        # Python dependencies
│   └── scripts/
│       └── process_excel.py    # Data processing script
└── README.md                   # This file
```

---

## Next Steps

1. ✅ Start Docker: `docker-compose up -d`
2. ✅ Open: `http://localhost:3000`
3. ✅ Register/Login
4. ✅ Import Excel data
5. ✅ View on dashboard!

Happy analyzing! 📊
