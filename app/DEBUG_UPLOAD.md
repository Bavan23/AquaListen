# 🐛 Debug Upload "Failed to fetch" Error

## **🔍 Step-by-Step Debugging:**

### **Step 1: Check if Python Backend is Running**
Open browser and visit: **http://localhost:8000/**

**Expected Result:**
- ✅ Should show: `{"message": "AquaListen API is running"}`
- ❌ If error: Python backend is not running

### **Step 2: Check FastAPI Documentation**
Visit: **http://localhost:8000/docs**

**Expected Result:**
- ✅ Should show FastAPI interactive docs
- ❌ If error: Backend not accessible

### **Step 3: Test Upload Endpoint Directly**
In browser console or Postman, test:
```javascript
fetch('http://localhost:8000/predict', {
  method: 'POST',
  body: new FormData()
}).then(r => r.text()).then(console.log)
```

## **🚀 Quick Fixes:**

### **Fix 1: Start Python Backend**
```bash
cd c:\Users\acer\OneDrive\Desktop\AquaListen
source venv/Scripts/activate
uvicorn aqualisten_api:app --host 0.0.0.0 --port 8000 --reload
```

### **Fix 2: Check Python API File**
Make sure `aqualisten_api.py` has the `/predict` endpoint:
```python
@app.post("/predict")
async def predict_audio(file: UploadFile = File(...)):
    # Your prediction logic here
    return {"success": True, "prediction": {...}}
```

### **Fix 3: Add CORS to Python Backend**
Add to `aqualisten_api.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Fix 4: Test with Simple Endpoint**
Add a simple test endpoint to `aqualisten_api.py`:
```python
@app.get("/test")
async def test_endpoint():
    return {"status": "working", "message": "Python backend is running"}
```

Then test: http://localhost:8000/test

## **🎯 Current Status Check:**

1. **Python Backend**: http://localhost:8000/ (should work)
2. **Node.js Backend**: http://localhost:3002/dashboard/stats (should work)
3. **Frontend**: http://localhost:5173/ (should work)

## **💡 Most Likely Issues:**

1. **Python backend not running** - Start with `uvicorn` command
2. **CORS not configured** - Add CORS middleware
3. **Wrong endpoint path** - Check `/predict` exists in Python API
4. **Port conflict** - Make sure nothing else uses port 8000

## **🔧 Quick Test:**

Run this in your browser console while on http://localhost:5173/:
```javascript
fetch('http://localhost:8000/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If this fails, your Python backend is not accessible!
