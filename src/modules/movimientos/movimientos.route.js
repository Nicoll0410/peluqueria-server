import { Router } from "express";
import { movimientosController } from "./movimientos.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js";


export const movimientosRouter = Router()


movimientosRouter.get("/", movimientosController.get)
movimientosRouter.post("/",
    [
        validaciones.estaVacio("cantidad", "La cantidad debe de ser obligatorio", { esNumerico: true }),
        validaciones.estaVacio("insumoID", "El ID de insumo debe de ser obligatorio"),
    ],
    movimientosController.create)