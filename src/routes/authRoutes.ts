import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware.js'; 

const router = Router();
const JWT_SECRET = 'smart_canteen_absolute_secret_key_2026';

// SIGNUP ROUTE
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, arNumber, password } = req.body; //  Extracting arNumber payload element 

    if (!name || !email || !arNumber || !password) {
      res.status(400).json({ message: 'All fields are required including valid ' });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      arNumber, // specific collection instance mapping
      passwordHash,
      role: 'student',
      balance: 500.00 
    });

    const token = jwt.sign(
      { _id: newUser._id.toString(), userId: newUser._id.toString(), role: newUser.role }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      role: newUser.role,
      user: { name: newUser.name, email: newUser.email, arNumber: newUser.arNumber }, // Transmitting identifier safely back downstream
      balance: newUser.balance
    });
  } catch (error) {
    console.error(' Signup Compilation Error:', error);
    res.status(500).json({ message: 'Signup failed due to a server error.' });
  }
});

// LOGIN ROUTE
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { _id: user._id.toString(), userId: user._id.toString(), role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(200).json({
      token,
      role: user.role, 
      user: { name: user.name, email: user.email, arNumber: user.arNumber }, //  Resolving persistent identity properties 
      balance: user.balance
    });
  } catch (error) {
    console.error(' Login Compilation Error:', error);
    res.status(500).json({ message: 'Server error during authentication login' });
  }
});

// UPDATE PROFILE DETAILS 
router.put('/update', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ message: 'Name and email are required fields' });
      return;
    }

    const emailConflict = await User.findOne({ email, _id: { $ne: userId } });
    if (emailConflict) {
      res.status(400).json({ message: 'This email address is already in use by another profile' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      res.status(404).json({ message: 'User profile not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: { name: updatedUser.name, email: updatedUser.email, arNumber: updatedUser.arNumber } //  Persists matching arNumber tracking integrity downstream
    });
  } catch (error: any) {
    console.error('Profile Update Backend Error:', error);
    res.status(500).json({ message: 'Server error during profile update ', error: error.message });
  }
});

// REGISTER Push token route
router.post('/push-token', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?._id;

    if (!pushToken) {
      res.status(400).json({ message: 'Push token is required' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { pushToken }, { returnDocument: 'after' as any });

    if (!updatedUser) {
      res.status(404).json({ message: 'User profile not found' });
      return;
    }

    res.status(200).json({ message: 'Expo Push Token registered successfully' });
  } catch (error: any) {
    console.error(' Push Token Registration Error:', error);
    res.status(500).json({ message: 'Server error during push token ', error: error.message });
  }
});

// FETCH PROFILE
router.get('/profile', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      res.status(404).json({ message: 'User profile not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error(' Profile Retrieval Error:', error);
    res.status(500).json({ message: 'Server error during profile ', error: error.message });
  }
});

export default router;