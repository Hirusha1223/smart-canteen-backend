import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  arNumber: string; //  Tracking unique registration attributes per identity instance
  passwordHash: string;
  role: 'student' | 'canteen_staff';
  balance: number; 
  pushToken?: string; 
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true 
    },
    arNumber: { 
      type: String, 
      required: true,
      trim: true
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['student', 'canteen_staff'], 
      default: 'student' 
    },
    balance: { 
      type: Number, 
      default: 0 
    },
    pushToken: {
      type: String, 
      default: ''
    }
  },
  { timestamps: true } 
);

const User = model<IUser>('User', userSchema);
export default User;