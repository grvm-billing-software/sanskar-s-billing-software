import { Router, type IRouter } from "express";
import { findActiveSession } from "./auth";
import authRouter from "./auth";
import healthRouter from "./health";
import inventoryBillingRouter from "./inventory-billing";
import patientsRouter from "./patients";
import reportsRouter from "./reports";
import staffRouter from "./staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(async (req, res, next): Promise<void> => {
  try {
    const session = await findActiveSession(req.cookies?.hospital_session);
    if (!session) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});
router.use(inventoryBillingRouter);
router.use(patientsRouter);
router.use(staffRouter);
router.use(reportsRouter);

export default router;
