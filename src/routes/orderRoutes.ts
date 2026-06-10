import express, { Response } from 'express';
import axios from 'axios'; // Standard HTTP client to dispatch notifications 
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = express.Router();

// Place a New Order and Balance 
router.post('/', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { items, totalAmount } = req.body;
    const userId = req.user?._id;

    if (!items || items.length === 0) {
      res.status(400).json({ message: "Cannot place an empty order" });
      return;
    }

    // Double check user balance from real database 
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    if (user.balance < totalAmount) {
      res.status(400).json({ message: "Insufficient database balance. Transaction rejected." });
      return;
    }

    // Deduct core funds from Database directly
    user.balance -= totalAmount;
    await user.save();

    // transaction logging row
    const newOrder = new Order({
      user: userId,
      items,
      totalAmount,
      status: 'pending'
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error: any) {
    res.status(500).json({ message: "Error processing checkout transaction", error: error.message });
  }
});

//  Get all Orders 
router.get('/', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    let orders;
    
    if (userRole === 'canteen_staff') {
      // Admin reads entire grid 
      orders = await Order.find()
        .populate('user', 'name email')
        .populate('items.menuItem', 'name price')
        .sort({ createdAt: -1 });
    } else {
      // Regular student reads only their historical purchases
      orders = await Order.find({ user: userId })
        .populate('items.menuItem', 'name price')
        .sort({ createdAt: -1 });
    }

    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ message: "Error retrieving orders history", error: error.message });
  }
});

//Update Order Status and Trigger Push Notifications
router.put('/:id/status', protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const userRole = req.user?.role;

    // Only canteen staff can mutate workflow 
    if (userRole !== 'canteen_staff') {
      res.status(403).json({ message: "Access denied. Action restricted to canteen staff." });
      return;
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status state transition requested" });
      return;
    }

    // returnDocument type-casting to eliminate Mongoose terminal warnings
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { returnDocument: 'after' as any }
    );

    if (!updatedOrder) {
      res.status(404).json({ message: "Target order transaction record not found" });
      return;
    }

    // Query target student profile to read pushToken field
    const studentUser = await User.findById(updatedOrder.user);
    
    if (studentUser && studentUser.pushToken) {
      let titleMessage = 'Smart Canteen Alert ';
      let bodyMessage = `Your order status changed to ${status}`;

      // Construct descriptive contextual messages tailored 
      if (status === 'preparing') {
        titleMessage = 'Order Kitchen Update ';
        bodyMessage = 'The canteen kitchen team started preparing your hot meal!';
      } else if (status === 'ready') {
        titleMessage = 'Meal Ready for Pickup! ';
        bodyMessage = 'Your fresh order is waiting at the counter. Please collect it now.';
      } else if (status === 'completed') {
        titleMessage = 'Order Completed ➔';
        bodyMessage = 'Thank you for ordering through Smart Canteen!';
      } else if (status === 'cancelled') {
        titleMessage = 'Order Cancelled ';
        bodyMessage = 'Your order has been cancelled. Please contact canteen desk.';
      }

      // Fire asynchronous axios call directly targeting Expo API endpoints gateway
      axios.post('https://exp.host/--/api/v2/push/send', {
        to: studentUser.pushToken,
        sound: 'default',
        title: titleMessage,
        body: bodyMessage,
        data: { orderId: updatedOrder._id, nextState: status },
      }, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      }).then(() => {
        console.log(`  dispatch successful to token user [${studentUser.name}]`);
      }).catch((pushError) => {
        console.error(' Expo Gateway Dispatch Failure Protocol:', pushError.message);
      });
    }

    res.status(200).json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating order lifecycle transition", error: error.message });
  }
});

export default router;