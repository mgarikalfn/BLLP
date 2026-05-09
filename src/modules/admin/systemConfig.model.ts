import { Schema, model, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  isAIGenerationEnabled: boolean;
  activeSeasonId: string;
  maintenanceMode: boolean;
  dailyXpCap: number;
}

interface SystemConfigModel extends Model<ISystemConfig> {
    getSingleton(): Promise<ISystemConfig>;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    isAIGenerationEnabled: { type: Boolean, default: true },
    activeSeasonId: { type: String, default: "S1" },
    maintenanceMode: { type: Boolean, default: false },
    dailyXpCap: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

// Static method to ensure only one document exists
systemConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

export const SystemConfig = model<ISystemConfig, SystemConfigModel>("SystemConfig", systemConfigSchema);
