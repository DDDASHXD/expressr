import { Request, Response } from "express";

export function get(req: Request, res: Response) {
  const { id } = req.params;
  res.json({ message: `Getting example with id: ${id}` });
}
