import { Request, Response } from "express";

export function get(req: Request, res: Response) {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
}
