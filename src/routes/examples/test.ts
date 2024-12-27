import { Request, Response } from "express";

export function get(req: Request, res: Response) {
  res.json({ message: "This is a GET request to /examples/test" });
}

export function post(req: Request, res: Response) {
  res.json({ message: "This is a POST request to /examples/test" });
}
