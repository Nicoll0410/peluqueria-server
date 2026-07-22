import { Router } from "express";
import { ventasController } from "./ventas.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js"


export const RouterVentas = Router()

RouterVentas.get("/" , ventasController.get)
RouterVentas.post("/" , [
    validaciones.estaVacio("comentarios" , "Los comentarios son obligatorios"),
    validaciones.estaVacio("fecha" , "La fecha es obligatoria"),
    validaciones.estaVacio("subtotal" , "El subtotal es obligatorio"),
    validaciones.estaVacio("descuento" , "El descuento es obligatorio"),
    validaciones.estaVacio("total" , "El total es obligatorio"),
], ventasController.create)
RouterVentas.put("/" , [
    validaciones.estaVacio("comentarios" , "Los comentarios son obligatorios"),
    validaciones.estaVacio("fecha" , "La fecha es obligatoria"),
    validaciones.estaVacio("subtotal" , "El subtotal es obligatorio"),
    validaciones.estaVacio("descuento" , "El descuento es obligatorio"),
    validaciones.estaVacio("total" , "El total es obligatorio"),
], ventasController.update)
RouterVentas.delete("/" , ventasController.delete)