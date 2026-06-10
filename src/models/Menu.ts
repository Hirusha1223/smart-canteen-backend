import mongoose, { Schema, Document } from 'mongoose';

// Interface for Menu Document
export interface IMenu extends Document {
  name: string;
  price: number;
  image: string; // File URL path stored here
  category: string; //  Explicit category field directly from database
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true // Making it required since it is a core feature
  },
  category: {
    type: String,
    required: true,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Shorteats', 'Snacks', 'Drinks'], // Strict validation rule matching frontend tabs
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Menu = mongoose.model<IMenu>('Menu', menuSchema);
export default Menu;