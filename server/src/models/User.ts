import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  playerId: mongoose.Types.ObjectId;
  refreshTokens: string[];
  isActive: boolean;
  isAdmin: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      unique: true,
    },
    refreshTokens: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString: () => string }).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.index({ email: 1 });
userSchema.index({ playerId: 1 });

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
