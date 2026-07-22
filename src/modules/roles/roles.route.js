import { Router } from "express";
import { rolesController } from "./roles.controller.js";
import { validaciones } from "../../middlewares/validaciones.middleware.js";


export const rolesRouter = Router()

rolesRouter.get("/", rolesController.get)
rolesRouter.get("/all", rolesController.getAll)
rolesRouter.get("/permisos", rolesController.getPermissions)
rolesRouter.get("/permisos/:id", rolesController.getPermissionsFromRole)
rolesRouter.get("/workers", rolesController.getWorkersRoles)

rolesRouter.post("/", [
    validaciones.estaVacio("nombre", "El nombre del rol es obligatorio", { max: 50 }),
    validaciones.estaVacio("permisos", "Los permisos del rol son obligatorios", { max: Number.POSITIVE_INFINITY }),
], rolesController.create)

rolesRouter.put("/:id", rolesController.update)
rolesRouter.delete("/:id", rolesController.delete)