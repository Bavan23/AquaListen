# 🚀 Dynamic Dashboard Setup - Increasing Data

## **🎯 Goal: Make Dashboard Numbers Increase Dynamically**

Your dashboard will show **real-time increasing data** from MongoDB!

## **📋 Step-by-Step Setup:**

### **Step 1: Create .env File Manually**
Create a file named `.env` in the `app` directory with:
```
DATABASE_URL=mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/aqualisten?retryWrites=true&w=majority&appName=AquaListen
PORT=3002
NODE_ENV=development
```

### **Step 2: Start Your Backend**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen\app
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB
Server running at http://127.0.0.1:3002
```

### **Step 3: Test Database Connection**
Visit: http://localhost:3002/dashboard/stats

**Should return:**
```json
{
  "totalSites": 10,
  "healthySites": 4,
  "totalPredictions": 30,
  "activeAlerts": 8,
  "globalAverage": 75.2
}
```

### **Step 4: Add Dynamic Increasing Data**

**Method A: Using API (Recommended)**
Visit in browser: http://localhost:3002/add-dynamic-data

**Method B: Using npm script**
```bash
npm run add-data
```

**Expected Result:**
```
🚀 Adding dynamic increasing data...
✅ Added prediction: healthy (87.3%)
✅ Added prediction: stressed (74.1%)
🚨 Added alert: stress_detected (high)
📊 Updated counts:
   • Total Predictions: 35 (was 30)
   • Total Alerts: 10 (was 8)
```

### **Step 5: Refresh Dashboard**
Visit: http://localhost:5173/

**You should see INCREASED numbers:**
- **Total Predictions**: 35 (up from 30)
- **Active Alerts**: 5-6 (up from 3-4)
- **Recent Predictions**: New entries in live feed

## **🔄 Keep Adding Data**

**To simulate continuous growth:**
1. Visit: http://localhost:3002/add-dynamic-data
2. Refresh your dashboard
3. Numbers will keep increasing!

Each time you call the endpoint:
- **+5 new predictions**
- **+1-2 new alerts** (for stressed reefs)
- **Updated timestamps** (shows as "recent")

## **📊 Expected Dashboard Growth:**

| Run | Total Predictions | Active Alerts | Healthy Sites |
|-----|------------------|---------------|---------------|
| Initial | 30 | 8 | 4 |
| After 1st run | 35 | 9-10 | 4-5 |
| After 2nd run | 40 | 10-12 | 4-6 |
| After 3rd run | 45 | 11-14 | 5-7 |

## **🎉 Success Indicators:**

1. ✅ **MongoDB Connected**: No connection errors in terminal
2. ✅ **API Working**: http://localhost:3002/dashboard/stats returns data
3. ✅ **Dashboard Live**: http://localhost:5173/ shows real numbers
4. ✅ **Data Increasing**: Numbers go up each time you add data
5. ✅ **Live Feed**: Recent predictions show new entries

## **🚨 Troubleshooting:**

**If MongoDB connection fails:**
1. Check your .env file exists and has correct URI
2. Verify MongoDB Atlas cluster is not paused
3. Ensure your IP is whitelisted in MongoDB Atlas

**If dashboard shows zeros:**
1. Check browser console for API errors
2. Verify both backends are running (ports 3002 and 8000)
3. Test API directly: http://localhost:3002/dashboard/stats

**Your dashboard will now show dynamic, increasing data from MongoDB! 🎊**
