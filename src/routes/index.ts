import { Router } from "express";
import walrusRoutes from "./walrus_routes";

const router = Router();

router.use("/api", walrusRoutes);

export default router;
