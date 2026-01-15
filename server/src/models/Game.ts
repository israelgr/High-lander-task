import mongoose, { Schema, Document } from 'mongoose';
import { GameConfig, GameStatus, PlayerStatus, Goal } from '@high-lander/shared';

export interface GameDocument extends Document {
  code: string;
  hostPlayerId: string;
  status: GameStatus;
  config: GameConfig;
  goal?: Goal;
  players: Array<{
    playerId: string;
    username: string;
    status: PlayerStatus;
    joinedAt: Date;
    finishedAt?: Date;
    rank?: number;
  }>;
  winnerId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<GameDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    hostPlayerId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'starting', 'active', 'finished', 'cancelled'],
      default: 'waiting',
    },
    config: {
      maxPlayers: { type: Number, default: 10 },
      goalRadiusMin: { type: Number, default: 1000 },
      goalRadiusMax: { type: Number, default: 2000 },
      proximityThreshold: { type: Number, default: 30 },
      timeLimit: { type: Number },
    },
    goal: {
      position: {
        latitude: Number,
        longitude: Number,
      },
      generatedAt: Number,
      generatedFromPosition: {
        latitude: Number,
        longitude: Number,
      },
    },
    players: [
      {
        playerId: { type: String, required: true },
        username: { type: String, required: true },
        status: {
          type: String,
          enum: ['waiting', 'ready', 'playing', 'finished', 'disconnected'],
          default: 'waiting',
        },
        joinedAt: { type: Date, default: Date.now },
        finishedAt: Date,
        rank: Number,
      },
    ],
    winnerId: String,
    startedAt: Date,
    finishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

gameSchema.index({ code: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ hostPlayerId: 1 });

export const GameModel = mongoose.model<GameDocument>('Game', gameSchema);
