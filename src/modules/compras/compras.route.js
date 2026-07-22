import { Router } from "express";
import { comprasController } from "./compras.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js";

export const comprasRouter = Router()


comprasRouter.get("/all-with-search", comprasController.getAllWithSearch)
comprasRouter.get("/", comprasController.get)
comprasRouter.get("/:id", comprasController.getByID)

comprasRouter.post(
    "/",
    [
        validaciones.estaVacio("fecha", "La fecha de compra debe de ser obligatoria"),
        validaciones.estaVacio("metodo_pago", "El método de pago debe de ser obligatorio"),
        validaciones.estaVacio("proveedorID", "El id del proveedor debe de ser obligatorio"),

    ],
    comprasController.create)

comprasRouter.patch("/:id", comprasController.cancel)