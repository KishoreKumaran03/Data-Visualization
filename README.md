# 📊 Data Visualization Platform

A full-stack data analytics dashboard built with **React**, **Express.js**, **MySQL**, and **Docker**.

## ⚡ Quick Start (< 1 minute)

### Windows Users (Easiest)
```bash
1. Open START_DOCKER.bat (double-click)
2. Wait for browser to open (http://localhost:3000)
3. Register/Login
4. Click "Import Data" → Select Month & Year → Choose SAMPLE_DATA.csv
5. View results on dashboard!
```

### All Users (Terminal)
```bash
cd "Your Project Path"
docker-compose up -d
# Open: http://localhost:3000
```

---

## 🎯 What This Does

### ✅ Frontend (React + Vite)
- Beautiful, responsive dashboard
- Real-time data visualization
- Interactive charts (Recharts)
- Month/Year selector for data import
- Dark mode support
- Data filters and drilldowns

### ✅ Backend (Node.js + Express)
- RESTful API endpoints
- Excel/CSV file processing (Python)
- JWT authentication
- MySQL database integration
- File upload handling

### ✅ Database (MySQL 8.0)
- Stores users, projects, and sales data
- Automatic schema initialization
- Auto-backup volumes

### ✅ Docker Integration
- All services containerized
- One-command startup
- Automatic service dependencies
- Health checks & networking

---

## 📊 Features

### Data Import
- **Month/Year Selector**: Choose when before importing
- **File Upload**: Drag & drop or browse CSV/Excel
- **Automatic Processing**: Python script validates & transforms
- **Database Storage**: Automatically inserts into MySQL

### Dashboard Visualizations
1. **KPI Cards**: Revenue, Market Hubs, Users, Growth
2. **Trend Charts**: Revenue & Profit over time
3. **India Map**: Market hub locations & revenue
4. **Category Distribution**: Donut chart by type
5. **Regional Velocity**: Store performance metrics
6. **Year Filter**: View 2023, 2024, 2025 data

### Interactivity
- Hover for details on any chart
- Click bars to drill down into daily data
- Export to PDF or Excel
- Filter by region, category, segment
- Dark/Light theme toggle

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐    ┌──────────────┐               │
│  │   Frontend   │    │   Backend    │               │
│  │   (React)    │───→│ (Express.js) │               │
│  │ :3000        │    │ :8000        │               │
│  └──────────────┘    └──────────────┘               │
│                            │                         │
│                            ↓                         │
│                  ┌──────────────────┐               │
│                  │     Python       │               │
│                  │  Data Processor  │               │
│                  │ (process_excel)  │               │
│                  └──────────────────┘               │
│                            │                         │
│                            ↓                         │
│                  ┌──────────────────┐               │
│                  │      MySQL       │               │
│                  │   Database       │               │
│                  │ (datavis_db)     │               │
│                  └──────────────────┘               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Project/
├── docker-compose.yml          # Main Docker config
├── START_DOCKER.bat            # Easy startup (Windows)
├── STOP_DOCKER.bat             # Stop services (Windows)
│
├── DOCKER_SETUP.md             # Full Docker guide
├── DATA_IMPORT_GUIDE.md        # How to import data
├── QUICK_REFERENCE.md          # Quick commands
├── SAMPLE_DATA.csv             # Test data
│
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Main component
│       ├── main.jsx
│       └── index.css
│
└── backend/
    ├── Dockerfile
    ├── index.js                # Express server
    ├── init_db.sql             # Database schema
    ├── package.json
    ├── requirements.txt
    └── scripts/
        └── process_excel.py    # Data processing
```

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- ~2GB free disk space
- Port 3000, 8001, 3306 available

### Option 1: Windows Users (Simplest)
```bash
1. Double-click: START_DOCKER.bat
2. Done! Browser opens automatically
```

### Option 2: Terminal (All Platforms)
```bash
# Navigate to project
cd "path/to/Data Visualization"

# Start services
docker-compose up -d

# Open in browser
http://localhost:3000
```

### First Time Setup
1. **Register Account**: Create account on login page
2. **Import Sample Data**: 
   - Click "Import Data" button
   - Select: January, 2024
   - Choose: SAMPLE_DATA.csv
   - Upload starts automatically
3. **View Dashboard**: Charts populate in real-time

---

## 📚 Usage

### Importing Your Own Data

#### Data Format
```csv
date,category,region,revenue,quantity,cost
2024-01-15,Electronics,Maharashtra,50000,10,25000
2024-01-16,Furniture,Karnataka,30000,5,15000
2024-01-17,Others,Tamil Nadu,20000,8,10000
```

#### Import Steps
1. Prepare CSV file with exact columns
2. Click "Import Data" button
3. Select Month and Year
4. Choose your file
5. Wait for processing (2-5 seconds)
6. Dashboard updates automatically

### Viewing Data
- **Global View**: Dashboard home page
- **Store View**: Click store in "Managed Stores"
- **Detailed Analytics**: Click store to see regional breakdown

### Exporting Data
- Click "Export" button
- Choose: PDF, Excel CSV, or PDF + AI Summary

---

## 🔧 Common Commands

### View Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api      # Backend
docker-compose logs -f web      # Frontend
docker-compose logs -f db       # Database
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

### Stop Services
```bash
docker-compose down
```

### Stop & Reset Database
```bash
docker-compose down -v
```

### Rebuild Everything
```bash
docker-compose up -d --build
```

---

## 🆘 Troubleshooting

### Frontend won't load (http://localhost:3000)
```
✓ Wait 10-15 seconds after starting
✓ Check if Docker is running
✓ Run: docker-compose ps (check for 3 containers)
✓ Check logs: docker-compose logs web
```

### Database connection error
```
✓ Run: docker-compose restart db
✓ Wait 5 seconds
✓ Try again
✓ Check logs: docker-compose logs db
```

### Data not appearing after import
```
✓ Wait 5 seconds for processing
✓ Refresh page (F5)
✓ Check file format (must have all 6 columns)
✓ Check date format (must be YYYY-MM-DD)
✓ View logs: docker-compose logs api
```

### Port already in use
```
✓ Change ports in docker-compose.yml
✓ Or stop other applications using 3000, 8001, 3306
```

### Import dialog not showing
```
✓ Clear browser cache (Ctrl+Shift+Delete)
✓ Refresh page (F5)
✓ Check console for errors (F12)
```

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
```

### Data
```
POST   /api/upload              # Upload file
GET    /api/projects            # List projects/stores
GET    /api/dashboard/summary   # Global dashboard data
GET    /api/dashboard/:id       # Store-specific data
DELETE /api/dashboard/:id       # Clear store data
```

---

## 🔐 Security Notes

- Default credentials in docker-compose for development only
- Change JWT_SECRET in production
- Database password: "password" (change in production)
- Implement proper authentication for production
- Use HTTPS in production
- Add input validation/sanitization

---

## 📝 Example Workflow

```
1. Start Docker
   └─ Services: Frontend, Backend, Database

2. Register/Login
   └─ Create account in browser

3. Prepare Data
   └─ CSV file with columns: date, category, region, revenue, quantity, cost

4. Import Data
   └─ Click button → Select Month/Year → Choose file → Upload

5. View Results
   └─ Charts auto-populate
   └─ Interact with visualizations
   └─ Export if needed

6. Manage Data
   └─ Clear data (Discard Hub Records)
   └─ Import new data
   └─ Compare multiple months
```

---

## 🎨 Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  Header: Logo | Search | Dark Mode | Import    │
├─────────────────────────────────────────────────┤
│                                                   │
│  KPI Cards:  [Revenue] [Hubs] [Users] [Growth]  │
│                                                   │
│  ┌─────────────────────────┬──────────────────┐ │
│  │ Revenue & Profit Trend  │  India Map       │ │
│  │ (Line + Bar Chart)      │  (5 Markers)     │ │
│  └─────────────────────────┴──────────────────┘ │
│                                                   │
│  ┌─────────────────────────┬──────────────────┐ │
│  │ Category Split (Donut)  │ Vertical Perf    │ │
│  │ Electronics, Furniture  │ (Bar Charts)     │ │
│  └─────────────────────────┴──────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Features Roadmap

✅ Implemented:
- Data import with month/year selection
- Dashboard with 5+ visualization types
- User authentication
- Multi-store support
- Dark mode
- Data clearing/reset
- Export to PDF

🔄 In Development:
- Advanced AI analytics
- Predictive modeling
- Custom report generation
- Data filtering & drill-down

---

## 📞 Support

For issues:
1. Check **TROUBLESHOOTING** section above
2. View logs: `docker-compose logs -f`
3. Read guides: DOCKER_SETUP.md, DATA_IMPORT_GUIDE.md
4. Reference: QUICK_REFERENCE.md

---

## 📄 Documentation Files

| File | Purpose |
|------|---------|
| DOCKER_SETUP.md | Complete Docker setup guide |
| DATA_IMPORT_GUIDE.md | Detailed data import instructions |
| QUICK_REFERENCE.md | Quick command reference |
| SAMPLE_DATA.csv | Example data for testing |

---

## 🎉 You're All Set!

1. ✅ Docker configured
2. ✅ Frontend & Backend linked
3. ✅ Database initialized
4. ✅ Import options ready
5. ✅ Dashboard projecting data

**Next:** Double-click START_DOCKER.bat and start analyzing! 📊

---

**Last Updated:** March 2026  
**Version:** 1.0  
**Status:** Production Ready ✨
