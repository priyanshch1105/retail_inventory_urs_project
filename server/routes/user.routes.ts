import { Router } from "express";
import { z } from "zod";
import { authRequired, allowRoles } from "../auth";
import { asyncHandler } from "../middleware/async.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { staffAccountSchema } from "../validation";
import { createStaff, list, updateStaffStatus } from "../controllers/user.controller";

const router = Router();
router.use(authRequired, allowRoles("Admin"));
router.get("/", asyncHandler(list));
router.post("/staff", validateBody(staffAccountSchema), asyncHandler(createStaff));
router.patch("/:id/status", validateBody(z.object({ active: z.boolean() })), asyncHandler(updateStaffStatus));
export default router;
