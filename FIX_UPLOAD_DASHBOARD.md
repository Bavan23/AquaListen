# 🔧 Fix Upload → Dashboard Connection

## **🚨 Problem Identified:**
When you upload WAV files, predictions go to Python backend but **don't update the dashboard** because:
- **Python backend** was using in-memory storage (not MongoDB)
- **Dashboard** reads from MongoDB via Node.js backend
- **No connection** between the two storage systems

## **✅ Solution Implemented:**
Created MongoDB storage for Python backend so uploads **directly update dashboard**!

## **🚀 Setup Steps:**

### **Step 1: Install Required Python Package**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen
pip install motor
```

### **Step 2: Create .env File**
Create `.env` in the `app` directory:
```
DATABASE_URL=mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/aqualisten?retryWrites=true&w=majority&appName=AquaListen
PORT=3002
NODE_ENV=development
```

### **Step 3: Start Both Backends**

**Terminal 1 - Python Backend:**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen
uvicorn aqualisten_api:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Node.js Backend:**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen\app
npm run dev
```

### **Step 4: Test the Connection**

1. **Visit Dashboard**: http://localhost:5173/
2. **Note current numbers** (e.g., 30 predictions, 8 alerts)
3. **Upload a WAV file** on Upload page
4. **Refresh Dashboard** - numbers should increase!

## **🎯 Expected Behavior:**

### **Before Upload:**
- Total Predictions: 30
- Active Alerts: 8

### **After Upload:**
- Total Predictions: **31** ⬆️
- Active Alerts: **9** ⬆️ (if stressed reef detected)
- Recent Predictions: **New entry appears**

## **🔍 How It Works Now:**

1. **Upload WAV** → Python FastAPI (port 8000)
2. **ML Processing** → SurfPerch model classifies audio
3. **Save to MongoDB** → Python backend saves prediction
4. **Auto-create Alert** → If stressed reef detected (>70% confidence)
5. **Dashboard Updates** → Node.js backend reads from same MongoDB
6. **Real-time Data** → Frontend shows increased numbers

## **✅ Success Indicators:**

1. **Python Backend Logs:**
   ```
   ✅ Python backend connected to MongoDB
   ✅ Prediction saved to MongoDB: your_file.wav
   🚨 Alert created: stress_detected
   ```

2. **Dashboard Changes:**
   - Prediction count increases by 1
   - Alert count increases (if stressed)
   - Recent predictions shows new entry
   - Live feed updates with new data

3. **API Test:**
   - Before upload: http://localhost:3002/dashboard/stats
   - After upload: Same URL shows higher numbers

## **🚨 Troubleshooting:**

**If upload doesn't update dashboard:**
1. Check Python backend logs for MongoDB connection
2. Verify both backends use same MongoDB URI
3. Test: http://localhost:3002/dashboard/stats before/after upload

**If Python backend fails to start:**
1. Install motor: `pip install motor`
2. Check virtual environment is activated
3. Verify MongoDB URI is correct

**If dashboard still shows old numbers:**
1. Hard refresh browser (Ctrl+F5)
2. Check browser console for API errors
3. Verify Node.js backend is reading from MongoDB

## **🎉 Final Test:**

1. **Upload 3 different WAV files**
2. **Dashboard should show:**
   - Total Predictions: +3
   - Active Alerts: +1 to +3 (depending on classifications)
   - Recent Predictions: 3 new entries

**Your uploads will now directly update the dashboard in real-time! 🚀**
