import { Router } from "express";
import { proveedoresController } from "./proveedores.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js"

export const proveedoresRouter = Router();

proveedoresRouter.get("/", proveedoresController.get);
proveedoresRouter.get("/all", proveedoresController.getAll);
proveedoresRouter.get("/all-with-search", proveedoresController.getAllWithSearch);
proveedoresRouter.get("/by-id/:id", proveedoresController.byId);

proveedoresRouter.post("/", [
    validaciones.estaVacio("identificacion", "La identificación es obligatoria", { max : 10}),
    validaciones.estaVacio("nombre", "El nombre es obligatorio", { max : 50}), 
    validaciones.estaVacio("nombreContacto", "El nombre del contacto es obligatorio", { max : 50}),
    validaciones.estaVacio("email", "El correo electrónico es obligatorio", { max : 80}),
    validaciones.estaVacio("telefono", "El teléfono es obligatorio", { max : 10, esNumerico : true}),
    validaciones.estaVacio("tipo", "El tipo es obligatorio"),
], proveedoresController.create);

proveedoresRouter.put("/:id", [
    validaciones.estaVacio("identificacion", "La identificación es obligatoria", { max : 10}),
    validaciones.estaVacio("nombre", "El nombre es obligatorio", { max : 50}), 
    validaciones.estaVacio("nombreContacto", "El nombre del contacto es obligatorio", { max : 50}),
    validaciones.estaVacio("email", "El correo electrónico es obligatorio", { max : 80}),
    validaciones.estaVacio("telefono", "El teléfono es obligatorio", { max : 10, esNumerico : true}),
    validaciones.estaVacio("tipo", "El tipo es obligatorio"),
], proveedoresController.update);

proveedoresRouter.delete("/:id", proveedoresController.delete);
