import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Menu from '../models/Menu.js'; 
import { protect, authorizeAdmin, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

// 1. Seed Menu Items 
router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    await Menu.deleteMany({});

    const sampleItems = [
      { name: "Chicken Rice and Curry", price: 170.00, category: "Lunch", image: "uploads/placeholder.jpg" },
      { name: "Fish Rice and Curry", price: 120.00, category: "Lunch", image: "uploads/placeholder.jpg" },
      { name: "Tea", price: 50.00, category: "Drinks", image: "uploads/placeholder.jpg" },
      { name: "Plainty", price: 10.00, category: "Drinks", image: "uploads/placeholder.jpg" },
      { name: "Cake One Slice", price: 60.00, category: "Snacks", image: "uploads/placeholder.jpg" },
      { name: "String Hoppers Set", price: 100.00, category: "Breakfast", image: "uploads/placeholder.jpg" },
      { name: "Fried Rice Dinner", price: 250.00, category: "Dinner", image: "uploads/placeholder.jpg" }
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
    // Destructured implicit category payload property from multipart request body stream
    const { name, price, category } = req.body;

    if (!name || !price || !category) {
      res.status(400).json({ message: "Please provide all required fields including category allocation" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Please upload an image for the menu item" });
      return;
    }

    const imagePath = `uploads/${req.file.filename}`;

    const newItem = new Menu({
      name,
      price: Number(price),
      category, //  Assigned directly to satisfy backend database validation rules
      image: imagePath,
      isAvailable: true
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error: any) {
    res.status(500).json({ message: "Error adding menu item", error: error.message });
  }
});

// 4. update menu item Details and Availability Admin Only
router.patch('/:id', protect, authorizeAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    //  Added category to Added to fix a 404 error during layout loading.
    const { name, price, category, isAvailable } = req.body; 

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category; //  modified category updates dynamically
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