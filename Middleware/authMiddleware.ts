import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
    auth?: {
        userId?: string;
        sessionId?: string;
        [key: string]: any; // Allow additional properties
    };
}

const protectedRoute = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !req.auth.userId) {
        res.status(401).json({ error: "Unauthorized access" });
    }
    next();
};

export default protectedRoute;
