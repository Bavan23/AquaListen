# 🚀 AquaListen Dual Backend Setup

## **Architecture Overview:**

```
Frontend (React) 
    ↓
├── Database Operations → Node.js Express (Port 3002)
│   ├── Dashboard stats
│   ├── Sites data  
│   ├── Predictions history
│   └── Alerts
│
└── ML Operations → Python FastAPI (Port 8000)
    ├── Audio file upload
    ├── ML model inference
    ├── Health predictions
    └── Model info
```

## **🎯 Complete Setup (2 Terminals):**

### **Terminal 1: Python FastAPI Backend (ML)**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen
source venv/Scripts/activate  # Activate Python virtual environment
uvicorn aqualisten_api:app --host 0.0.0.0 --port 8000 --reload
```
**Expected Output:**
```
INFO: AquaListen SavedModel loaded successfully
INFO: AquaListen system initialized successfully
INFO: Uvicorn running on http://0.0.0.0:8000
```

### **Terminal 2: Node.js Backend + Frontend (Full Stack)**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen\app
npm run dev
```
**Expected Output:**
```
Server running at http://127.0.0.1:3002
✅ Connected to MongoDB
[vite] ready in 500ms
Local: http://localhost:5173/
```

**Note**: `npm run dev` runs BOTH the Node.js backend (port 3002) AND the React frontend (port 5173) together!

## **🔍 Test Both Backends:**

### **Python FastAPI (Port 8000) - ML Operations:**
- **Health Check**: http://localhost:8000/
- **Model Info**: http://localhost:8000/docs (FastAPI docs)
- **Upload Test**: Use frontend Upload page

### **Node.js Express (Port 3002) - Database Operations:**
- **Dashboard Stats**: http://localhost:3002/dashboard/stats
- **Sites**: http://localhost:3002/sites  
- **Recent Predictions**: http://localhost:3002/predictions/recent?limit=5
- **Alerts**: http://localhost:3002/alerts
- **Seed Database**: http://localhost:3002/seed-database

## **✅ Expected Results:**

### **Dashboard Stats (Port 3002):**
```json
{
  "totalSites": 10,
  "healthySites": 4,
  "totalPredictions": 30,
  "activeAlerts": 8,
  "globalAverage": 75.2
}
```

### **Sites Data (Port 3002):**
```json
[
  {
    "id": "...",
    "name": "Great Barrier Reef - Station A",
    "location": "Queensland, Australia",
    "latitude": -16.2839,
    "longitude": 145.7781,
    "status": "active"
  }
]
```

## **🎮 Frontend Integration:**

The frontend now automatically routes requests:
- **Dashboard data** → Node.js (port 3002)
- **Audio uploads** → Python (port 8000)
- **ML predictions** → Python (port 8000)
- **Site management** → Node.js (port 3002)

## **🐛 Troubleshooting:**

### **Port Conflicts:**
```bash
# Check what's running on ports
netstat -ano | findstr :8000
netstat -ano | findstr :3002

# Kill process if needed
taskkill /PID <process_id> /F
```

### **MongoDB Connection:**
- Make sure `.env` file exists with `DATABASE_URL`
- Check MongoDB Atlas cluster is running

### **Python Dependencies:**
```bash
pip install fastapi uvicorn tensorflow librosa numpy
```

## **🎉 Success Indicators:**

1. ✅ **Python Backend**: TensorFlow model loads successfully
2. ✅ **Node.js Backend**: MongoDB connection established  
3. ✅ **Frontend**: Dashboard shows real data (not zeros)
4. ✅ **Integration**: Upload page can process audio files
5. ✅ **Database**: 30 predictions and 8 alerts visible

## **🔄 Workflow:**

1. **Upload Audio** → Python FastAPI processes with ML model
2. **Save Results** → Node.js stores prediction in MongoDB  
3. **Dashboard Updates** → Frontend fetches new data from Node.js
4. **Alerts Generated** → Node.js creates alerts for stressed reefs

**Both backends are now working together! 🎊**
