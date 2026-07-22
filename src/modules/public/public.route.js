import { Router } from "express";
import { publicController } from "./public.controller.js";

export const publicRouter = Router()


publicRouter.get("/services", publicController.getServices)
publicRouter.get("/popular-services", publicController.getPopularServices)