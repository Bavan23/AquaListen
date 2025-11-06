import { connectToDatabase } from "./database";
import { ReefSite as ReefSiteModel, Prediction as PredictionModel, Alert as AlertModel } from "./models";

export async function addDynamicData() {
  try {
    await connectToDatabase();
    console.log('🚀 Adding dynamic increasing data...');

    // Get existing sites
    const sites = await ReefSiteModel.find();
    console.log(`📍 Found ${sites.length} reef sites`);

    if (sites.length === 0) {
      console.log('❌ No sites found. Run seed script first.');
      return;
    }

    // Add 5 new predictions with current timestamp
    const healthStatuses = ['healthy', 'stressed', 'ambient'];
    const newPredictions = [];

    for (let i = 0; i < 5; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const healthStatus = healthStatuses[Math.floor(Math.random() * healthStatuses.length)];
      
      // Create realistic confidence based on health status
      let confidence;
      if (healthStatus === 'healthy') {
        confidence = 0.80 + Math.random() * 0.15; // 80-95%
      } else if (healthStatus === 'stressed') {
        confidence = 0.70 + Math.random() * 0.20; // 70-90%
      } else {
        confidence = 0.65 + Math.random() * 0.25; // 65-90%
      }

      const prediction = new PredictionModel({
        siteId: site._id,
        filename: `live_${Date.now()}_${i}.wav`,
        healthStatus,
        confidence,
        audioFeatures: JSON.stringify({
          spectral_centroid: 1200 + Math.random() * 800,
          spectral_bandwidth: 600 + Math.random() * 400,
          zero_crossing_rate: Math.random() * 0.1,
          mfcc_mean: Math.random() * 15 - 7,
          rms_energy: Math.random() * 0.4
        }),
        processingTime: 3 + Math.random() * 4,
        createdAt: new Date() // Current timestamp
      });

      await prediction.save();
      newPredictions.push(prediction);
      console.log(`✅ Added prediction: ${healthStatus} (${(confidence * 100).toFixed(1)}%)`);
    }

    // Add 2 new alerts for stressed predictions
    const stressedPredictions = newPredictions.filter(p => p.healthStatus === 'stressed');
    
    for (const prediction of stressedPredictions.slice(0, 2)) {
      const site = sites.find(s => s._id.toString() === prediction.siteId?.toString());
      
      const alertTypes = ['stress_detected', 'biodiversity_loss', 'temperature_anomaly'];
      const severities = ['medium', 'high', 'critical'];
      
      const alert = new AlertModel({
        siteId: prediction.siteId,
        predictionId: prediction._id,
        alertType: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: `New reef stress detected at ${site?.name || 'Unknown Site'} with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        isRead: 0, // Unread
        createdAt: new Date()
      });

      await alert.save();
      console.log(`🚨 Added alert: ${alert.alertType} (${alert.severity})`);
    }

    // Get updated counts
    const totalPredictions = await PredictionModel.countDocuments();
    const totalAlerts = await AlertModel.countDocuments();
    const unreadAlerts = await AlertModel.countDocuments({ isRead: 0 });

    console.log('\n🎉 Dynamic data added successfully!');
    console.log(`📊 Updated counts:`);
    console.log(`   • Total Predictions: ${totalPredictions}`);
    console.log(`   • Total Alerts: ${totalAlerts}`);
    console.log(`   • Unread Alerts: ${unreadAlerts}`);
    console.log('\n✅ Dashboard will now show increased numbers!');
    
    return {
      predictionsAdded: 5,
      alertsAdded: stressedPredictions.slice(0, 2).length,
      totalPredictions,
      totalAlerts,
      unreadAlerts
    };

  } catch (error) {
    console.error('❌ Error adding dynamic data:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (process.argv[1] && process.argv[1].includes('add-dynamic-data')) {
  addDynamicData()
    .then(() => {
      console.log('🚀 Dynamic data addition completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to add dynamic data:', error);
      process.exit(1);
    });
}
