import { Router } from "express";
import { serviciosController } from "./servicios.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js";

export const serviciosRouter = Router()


serviciosRouter.get("/", serviciosController.get)
serviciosRouter.get("/:id", serviciosController.findByPk)
serviciosRouter.post("/", [
    validaciones.estaVacio("nombre", "el nombre del servicio es obligatorio"),
    validaciones.estaVacio("descripcion", "la descripción del servicio es obligatorio"),
    validaciones.estaVacio("duracionMaxima", "la duración maxima del servicio es obligatorio"),
    validaciones.estaVacio("precio", "el precio del servicio es obligatorio"),
    validaciones.estaVacio("insumos", "Los insumos son obligatorios"),

], serviciosController.create)

serviciosRouter.put("/:id", [
    validaciones.estaVacio("nombre", "el nombre del servicio es obligatorio"),
    validaciones.estaVacio("descripcion", "la descripción del servicio es obligatorio"),
    validaciones.estaVacio("duracionMaxima", "la duración maxima del servicio es obligatorio"),
    validaciones.estaVacio("precio", "el precio del servicio es obligatorio"),
    validaciones.estaVacio("insumos", "Los insumos son obligatorios"),
], serviciosController.update)
serviciosRouter.delete("/:id", serviciosController.delete)