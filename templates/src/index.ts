import express from "express";
import path from "path";
import { loadRoutes } from "./utils/routeLoader";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load routes
const routesDir = path.join(__dirname, "routes");
app.use(loadRoutes(routesDir));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
