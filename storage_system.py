# Simple Python storage system for AquaListen API
import uuid
from datetime import datetime
from typing import List, Dict, Optional

class ReefSite:
    def __init__(self, name: str, location: str, latitude: float, longitude: float):
        self.id = str(uuid.uuid4())
        self.name = name
        self.location = location
        self.latitude = latitude
        self.longitude = longitude
        self.status = "active"
        self.createdAt = datetime.now().isoformat()

class Prediction:
    def __init__(self, site_id: str, filename: str, health_status: str, confidence: float, processing_time: float = None):
        self.id = str(uuid.uuid4())
        self.siteId = site_id
        self.filename = filename
        self.healthStatus = health_status
        self.confidence = confidence
        self.audioFeatures = None
        self.processingTime = processing_time
        self.createdAt = datetime.now().isoformat()

class Alert:
    def __init__(self, site_id: str, prediction_id: str, alert_type: str, message: str, severity: str = "medium"):
        self.id = str(uuid.uuid4())
        self.siteId = site_id
        self.predictionId = prediction_id
        self.alertType = alert_type
        self.message = message
        self.severity = severity
        self.isRead = 0
        self.createdAt = datetime.now().isoformat()

class MemoryStorage:
    def __init__(self):
        self.sites: Dict[str, ReefSite] = {}
        self.predictions: Dict[str, Prediction] = {}
        self.alerts: Dict[str, Alert] = {}
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with Australian reef sites"""
        sample_sites = [
            {"name": "Great Barrier Reef - Station A", "location": "Queensland, Australia", "latitude": -16.2839, "longitude": 145.7781},
            {"name": "Coral Bay Marine Park", "location": "Western Australia", "latitude": -23.1394, "longitude": 113.7661},
            {"name": "Ningaloo Reef - North", "location": "Western Australia", "latitude": -21.9333, "longitude": 113.9167},
            {"name": "Heron Island Research Station", "location": "Queensland, Australia", "latitude": -23.4425, "longitude": 151.9153},
            {"name": "Lady Elliot Island", "location": "Queensland, Australia", "latitude": -24.1133, "longitude": 152.7153}
        ]
        
        for site_data in sample_sites:
            site = ReefSite(**site_data)
            self.sites[site.id] = site
    
    async def getAllSites(self) -> List[Dict]:
        """Get all reef sites"""
        return [
            {
                "id": site.id,
                "name": site.name,
                "location": site.location,
                "latitude": site.latitude,
                "longitude": site.longitude,
                "status": site.status,
                "createdAt": site.createdAt
            }
            for site in self.sites.values()
        ]
    
    async def createPrediction(self, prediction_data: Dict) -> Dict:
        """Create a new prediction"""
        prediction = Prediction(
            site_id=prediction_data.get("siteId"),
            filename=prediction_data.get("filename"),
            health_status=prediction_data.get("healthStatus"),
            confidence=prediction_data.get("confidence"),
            processing_time=prediction_data.get("processingTime")
        )
        self.predictions[prediction.id] = prediction
        
        # Auto-create alert if stressed reef detected
        if prediction.healthStatus == 'stressed' and prediction.confidence > 0.7:
            await self.createAlert({
                "siteId": prediction.siteId,
                "predictionId": prediction.id,
                "alertType": "stress_detected",
                "message": f"Reef stress detected at {prediction.confidence * 100:.1f}% confidence",
                "severity": "high"
            })
        
        return {
            "id": prediction.id,
            "siteId": prediction.siteId,
            "filename": prediction.filename,
            "healthStatus": prediction.healthStatus,
            "confidence": prediction.confidence,
            "processingTime": prediction.processingTime,
            "createdAt": prediction.createdAt
        }
    
    async def getAllPredictions(self) -> List[Dict]:
        """Get all predictions"""
        return [
            {
                "id": pred.id,
                "siteId": pred.siteId,
                "filename": pred.filename,
                "healthStatus": pred.healthStatus,
                "confidence": pred.confidence,
                "processingTime": pred.processingTime,
                "createdAt": pred.createdAt
            }
            for pred in self.predictions.values()
        ]
    
    async def createAlert(self, alert_data: Dict) -> Dict:
        """Create a new alert"""
        alert = Alert(
            site_id=alert_data.get("siteId"),
            prediction_id=alert_data.get("predictionId"),
            alert_type=alert_data.get("alertType"),
            message=alert_data.get("message"),
            severity=alert_data.get("severity", "medium")
        )
        self.alerts[alert.id] = alert
        
        return {
            "id": alert.id,
            "siteId": alert.siteId,
            "predictionId": alert.predictionId,
            "alertType": alert.alertType,
            "message": alert.message,
            "severity": alert.severity,
            "isRead": alert.isRead,
            "createdAt": alert.createdAt
        }
    
    async def getAllAlerts(self) -> List[Dict]:
        """Get all alerts"""
        return [
            {
                "id": alert.id,
                "siteId": alert.siteId,
                "predictionId": alert.predictionId,
                "alertType": alert.alertType,
                "message": alert.message,
                "severity": alert.severity,
                "isRead": alert.isRead,
                "createdAt": alert.createdAt
            }
            for alert in self.alerts.values()
        ]
    
    async def getDashboardStats(self) -> Dict:
        """Get dashboard statistics"""
        all_sites = await self.getAllSites()
        all_predictions = await self.getAllPredictions()
        all_alerts = await self.getAllAlerts()
        
        # Calculate healthy sites based on recent predictions
        site_health = {}
        for pred in all_predictions:
            site_id = pred["siteId"]
            if site_id not in site_health or pred["createdAt"] > site_health[site_id]["createdAt"]:
                site_health[site_id] = pred
        
        healthy_sites = sum(1 for pred in site_health.values() if pred["healthStatus"] == "healthy")
        
        # Calculate global average confidence
        if all_predictions:
            total_confidence = sum(pred["confidence"] for pred in all_predictions)
            global_average = (total_confidence / len(all_predictions)) * 100
        else:
            global_average = 84.7  # Default value
        
        unread_alerts = [alert for alert in all_alerts if alert["isRead"] == 0]
        
        return {
            "totalSites": len(all_sites),
            "healthySites": healthy_sites,
            "totalPredictions": len(all_predictions),
            "activeAlerts": len(unread_alerts),
            "globalAverage": round(global_average, 1)
        }

# Global storage instance
storage = MemoryStorage()
