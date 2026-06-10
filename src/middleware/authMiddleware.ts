import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extended structure to support both mongo tracking 
interface JwtPayload {
  userId: string;
  _id: string; // Added to strictly eliminate TS2339 in orderRoutes
  role: 'student' | 'canteen_staff';
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      //  Key matched p with authRoutes signing value to eliminate 401 token 
      const secretKey = 'smart_canteen_absolute_secret_key_2026';
      const decoded = jwt.verify(token, secretKey) as any; 
      
      // Inject mapping to satisfy both tracking properties
      req.user = {
        userId: decoded.userId || decoded._id,
        _id: decoded._id || decoded.userId, // Mirror fields
        role: decoded.role
      };
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

export const authorizeAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'canteen_staff') {
    next(); 
  } else {
    res.status(403).json({ message: 'Access denied. Canteen staff only.' });
    return;
  }
};