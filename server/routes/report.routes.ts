import { Router } from "express";
import { authRequired, allowRoles } from "../auth";
import { sales, profit } from "../controllers/report.controller";
import { asyncHandler } from "../middleware/async.middleware";
const router = Router();
router.get("/sales", authRequired, asyncHandler(sales));
router.get("/profit", authRequired, allowRoles("Admin"), asyncHandler(profit));
export default router;
