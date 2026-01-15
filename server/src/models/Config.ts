import mongoose, { Schema, Document } from 'mongoose';
import { SystemConfig } from '@high-lander/shared';

export interface ConfigDocument extends Document {
  type: string;
  config: SystemConfig;
  createdAt: Date;
  updatedAt: Date;
}

const configSchema = new Schema<ConfigDocument>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export interface ConfigHistoryDocument extends Document {
  configType: string;
  config: SystemConfig;
  changedBy: string;
  changedAt: Date;
}

const configHistorySchema = new Schema<ConfigHistoryDocument>({
  configType: { type: String, required: true },
  config: { type: Schema.Types.Mixed, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

configHistorySchema.index({ configType: 1, changedAt: -1 });

export const ConfigModel = mongoose.model<ConfigDocument>('Config', configSchema);
export const ConfigHistoryModel = mongoose.model<ConfigHistoryDocument>(
  'ConfigHistory',
  configHistorySchema
);
