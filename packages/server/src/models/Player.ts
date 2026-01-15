import mongoose, { Schema, Document } from 'mongoose';
import { Player, PlayerStats } from '@high-lander/shared';

export interface PlayerDocument extends Omit<Player, 'id'>, Document {
  stats: PlayerStats;
  createdAt: Date;
  updatedAt: Date;
}

const playerSchema = new Schema<PlayerDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    avatarUrl: {
      type: String,
    },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 },
      averageTimeToGoal: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const PlayerModel = mongoose.model<PlayerDocument>('Player', playerSchema);
