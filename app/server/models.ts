import mongoose, { Schema, Document } from 'mongoose';

// User Interface and Schema
export interface IUser extends Document {
  _id: string;
  username: string;
  password: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Reef Site Interface and Schema
export interface IReefSite extends Document {
  _id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: string;
  createdAt: Date;
}

const ReefSiteSchema = new Schema<IReefSite>({
  name: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  status: { type: String, default: 'active' },
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Prediction Interface and Schema
export interface IPrediction extends Document {
  _id: string;
  siteId?: string;
  filename: string;
  healthStatus: string;
  confidence: number;
  audioFeatures?: string;
  processingTime?: number;
  createdAt: Date;
}

const PredictionSchema = new Schema<IPrediction>({
  siteId: { type: Schema.Types.ObjectId, ref: 'ReefSite' },
  filename: { type: String, required: true },
  healthStatus: { type: String, required: true },
  confidence: { type: Number, required: true },
  audioFeatures: { type: String },
  processingTime: { type: Number },
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Alert Interface and Schema
export interface IAlert extends Document {
  _id: string;
  siteId?: string;
  predictionId?: string;
  alertType: string;
  message: string;
  severity: string;
  isRead: number;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>({
  siteId: { type: Schema.Types.ObjectId, ref: 'ReefSite' },
  predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction' },
  alertType: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, default: 'medium' },
  isRead: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Export Models
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const ReefSite = mongoose.models.ReefSite || mongoose.model<IReefSite>('ReefSite', ReefSiteSchema);
export const Prediction = mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema);
export const Alert = mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
