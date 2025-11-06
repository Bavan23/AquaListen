# 🚨 Fix 500 Server Error on Node.js Backend

## **Current Issue:**
- `GET http://localhost:3002/dashboard/stats` returns 500 Internal Server Error
- This means your Node.js backend is running but MongoDB operations are failing

## **🔍 Debug Steps:**

### **Step 1: Check Node.js Backend Logs**
Look at your terminal running `npm run dev` for error messages like:
```
connection <monitor> to 159.41... timed out
MongoServerError: connection timeout
```

### **Step 2: Test MongoDB Connection Directly**
Visit: http://localhost:3002/health
- ✅ Should show: `{"status": "healthy", "database": "connected"}`
- ❌ If error: MongoDB connection is broken

### **Step 3: Check Your .env File**
Make sure you have:
```
DATABASE_URL=mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/?appName=AquaListen
PORT=3002
NODE_ENV=development
```

## **🚀 Quick Fixes:**

### **Fix 1: Restart Node.js Backend**
```bash
# Stop current backend (Ctrl+C)
cd c:\Users\acer\OneDrive\Desktop\AquaListen\app
npm run dev
```

### **Fix 2: Check MongoDB Atlas**
1. Visit: https://cloud.mongodb.com/
2. Make sure your cluster is **not paused**
3. Check **Network Access** - your IP should be whitelisted
4. Check **Database Access** - user `aqualisten` should exist

### **Fix 3: Test with Simple Endpoint**
Visit: http://localhost:3002/sites
- This should return your reef sites array
- If this fails too, it's definitely MongoDB

### **Fix 4: Fallback - Use Mock Data Temporarily**
If MongoDB keeps failing, I can modify the backend to use mock data temporarily.

## **🎯 Expected Working State:**

1. **Python Backend**: http://localhost:8000/ ✅ (working)
2. **Node.js Backend**: http://localhost:3002/dashboard/stats ❌ (500 error)
3. **Frontend**: http://localhost:5173/ ⚠️ (can't get data)

## **💡 Most Likely Causes:**

1. **MongoDB Atlas cluster paused** - Check web dashboard
2. **Network timeout** - MongoDB Atlas connection issues
3. **Wrong credentials** - Check .env file
4. **IP not whitelisted** - Check Network Access in MongoDB Atlas

## **🔧 Quick Test:**

Run this in your browser console:
```javascript
fetch('http://localhost:3002/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

This will tell us if the Node.js backend can connect to MongoDB at all.
