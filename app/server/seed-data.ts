import { connectToDatabase } from "./database";
import { User as UserModel, ReefSite as ReefSiteModel, Prediction as PredictionModel, Alert as AlertModel } from "./models";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export async function seedDatabase() {
  try {
    await connectToDatabase();
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await Promise.all([
      PredictionModel.deleteMany({}),
      AlertModel.deleteMany({}),
      // ReefSiteModel.deleteMany({}), // Keep sites as they're already initialized
    ]);

    // Get existing sites
    const sites = await ReefSiteModel.find();
    console.log(`📍 Found ${sites.length} reef sites`);

    if (sites.length === 0) {
      console.log('❌ No sites found. Creating sample sites...');
      // Create sample sites if none exist
      const sampleSites = [
        { name: "Great Barrier Reef - Station A", location: "Queensland, Australia", latitude: -16.2839, longitude: 145.7781 },
        { name: "Coral Bay Marine Park", location: "Western Australia", latitude: -23.1394, longitude: 113.7661 },
        { name: "Ningaloo Reef - North", location: "Western Australia", latitude: -21.9333, longitude: 113.9167 },
        { name: "Heron Island Research Station", location: "Queensland, Australia", latitude: -23.4425, longitude: 151.9153 },
        { name: "Lady Elliot Island", location: "Queensland, Australia", latitude: -24.1133, longitude: 152.7153 }
      ];

      for (const siteData of sampleSites) {
        const site = new ReefSiteModel({ ...siteData, status: "active" });
        await site.save();
      }
      
      // Refresh sites list
      const newSites = await ReefSiteModel.find();
      sites.push(...newSites);
      console.log(`✅ Created ${sampleSites.length} sample sites`);
    }

    // Create sample predictions with realistic data
    const healthStatuses = ['healthy', 'stressed', 'ambient'];
    const samplePredictions = [];

    console.log('🔮 Creating sample predictions...');
    
    for (let i = 0; i < 25; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const healthStatus = healthStatuses[Math.floor(Math.random() * healthStatuses.length)];
      
      // Create realistic confidence based on health status
      let confidence;
      if (healthStatus === 'healthy') {
        confidence = 0.75 + Math.random() * 0.2; // 75-95%
      } else if (healthStatus === 'stressed') {
        confidence = 0.65 + Math.random() * 0.25; // 65-90%
      } else {
        confidence = 0.60 + Math.random() * 0.3; // 60-90%
      }

      // Create dates spread over last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const prediction = new PredictionModel({
        siteId: site._id,
        filename: `reef_audio_${i + 1}_${Date.now()}.wav`,
        healthStatus,
        confidence,
        audioFeatures: JSON.stringify({
          spectral_centroid: 1000 + Math.random() * 2000,
          spectral_bandwidth: 500 + Math.random() * 1000,
          zero_crossing_rate: Math.random() * 0.1,
          mfcc_mean: Math.random() * 20 - 10,
          rms_energy: Math.random() * 0.5
        }),
        processingTime: 2 + Math.random() * 6, // 2-8 seconds
        createdAt
      });

      await prediction.save();
      samplePredictions.push(prediction);
    }

    console.log(`✅ Created ${samplePredictions.length} sample predictions`);

    // Create sample alerts for stressed reefs
    console.log('🚨 Creating sample alerts...');
    const stressedPredictions = samplePredictions.filter(p => p.healthStatus === 'stressed' && p.confidence > 0.7);
    
    for (const prediction of stressedPredictions.slice(0, 8)) { // Create alerts for first 8 stressed predictions
      const site = sites.find(s => s._id.toString() === prediction.siteId?.toString());
      
      const alertTypes = ['stress_detected', 'low_biodiversity', 'acoustic_anomaly'];
      const severities = ['medium', 'high', 'critical'];
      
      const alert = new AlertModel({
        siteId: prediction.siteId,
        predictionId: prediction._id,
        alertType: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: `Reef stress detected at ${site?.name || 'Unknown Site'} with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        isRead: Math.random() > 0.6 ? 1 : 0, // 40% unread
        createdAt: prediction.createdAt
      });

      await alert.save();
    }

    console.log(`✅ Created ${stressedPredictions.slice(0, 8).length} sample alerts`);

    // Create some additional recent predictions for "live feed"
    console.log('📊 Creating recent predictions for live feed...');
    for (let i = 0; i < 5; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const healthStatus = healthStatuses[Math.floor(Math.random() * healthStatuses.length)];
      
      const prediction = new PredictionModel({
        siteId: site._id,
        filename: `live_${Date.now()}_${i}.wav`,
        healthStatus,
        confidence: 0.7 + Math.random() * 0.25,
        audioFeatures: JSON.stringify({
          spectral_centroid: 1200 + Math.random() * 800,
          mfcc_mean: Math.random() * 15 - 7
        }),
        processingTime: 3 + Math.random() * 4,
        createdAt: new Date(Date.now() - i * 60000) // Last 5 minutes
      });

      await prediction.save();
    }

    console.log('✅ Created 5 recent predictions for live feed');

    // Summary
    const totalPredictions = await PredictionModel.countDocuments();
    const totalAlerts = await AlertModel.countDocuments();
    const totalSites = await ReefSiteModel.countDocuments();

    console.log('\n🎉 Database seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Sites: ${totalSites}`);
    console.log(`   • Predictions: ${totalPredictions}`);
    console.log(`   • Alerts: ${totalAlerts}`);
    console.log('\n✅ Your dashboard should now show dynamic data!');
    
    return {
      sites: totalSites,
      predictions: totalPredictions,
      alerts: totalAlerts
    };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly (ES module way)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDatabase()
    .then(() => {
      console.log('🚀 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
