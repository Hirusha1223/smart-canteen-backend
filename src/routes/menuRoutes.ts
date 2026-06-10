import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Menu from '../models/Menu.js'; 
import { protect, authorizeAdmin, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

// Cloudinary Configuration using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage Setup for Multer (TypeScript Type Assertion)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smart_canteen_items',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req: Request, file: Express.Multer.File) => 'image-' + Date.now()
  } as any
});

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({ storage, fileFilter });

// 1. Seed Menu Items (Using online fallback images instead of non-existent local files)
router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    await Menu.deleteMany({});

    const sampleItems = [
      { name: "Chicken Rice and Curry", price: 170.00, category: "Lunch", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" },
      { name: "Fish Rice and Curry", price: 120.00, category: "Lunch", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" },
      { name: "Tea", price: 50.00, category: "Drinks", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574" },
      { name: "Plainty", price: 10.00, category: "Drinks", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574" },
      { name: "Cake One Slice", price: 60.00, category: "Snacks", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b" },
      { name: "String Hoppers Set", price: 100.00, category: "Breakfast", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" },
      { name: "Fried Rice Dinner", price: 250.00, category: "Dinner", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19" }
    ];

    const createdItems = await Menu.insertMany(sampleItems);
    res.status(201).json({ message: "Menu seeded successfully!", data: createdItems });
  } catch (error: any) {
    res.status(500).json({ message: "Error seeding menu", error: error.message });
  }
});

// 2. Fetch All Menu Items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const menuItems = await Menu.find({});
    res.status(200).json(menuItems);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching menu items", error: error.message });
  }
});

// 3. Add New Menu Item with Image Upload Admin Only
router.post('/', upload.single('image'), protect, authorizeAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price || !category) {
      res.status(400).json({ message: "Please provide all required fields including category allocation" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Please upload an image for the menu item" });
      return;
    }

    // In Cloudinary setup, req.file.path holds the full live secure CDN URL string
    const imageLink = req.file.path;

    const newItem = new Menu({
      name,
      price: Number(price),
      category, 
      image: imageLink,
      isAvailable: true
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error: any) {
    res.status(500).json({ message: "Error adding menu item", error: error.message });
  }
});

// 4. Update menu item Details and Availability Admin Only
router.patch('/:id', protect, authorizeAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, price, category, isAvailable } = req.body; 

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category; 
    if (isAvailable !== undefined && typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;

    const updatedItem = await Menu.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedItem) {
      res.status(404).json({ message: "Menu item not found" });
      return;
    }

    res.status(200).json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating menu item", error: error.message });
  }
});

// 5. Delete Menu Item Admin Only
router.delete('/:id', protect, authorizeAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedItem = await Menu.findByIdAndDelete(id);

    if (!deletedItem) {
      res.status(404).json({ message: "Menu item not found" });
      return;
    }

    res.status(200).json({ message: "Menu item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting menu item", error: error.message });
  }
});

export default router;