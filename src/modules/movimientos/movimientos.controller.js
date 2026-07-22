import { response, request } from "express";
import { Movimiento } from "./movimientos.model.js";
import { Insumo } from "../insumos/insumos.model.js";
import { CategoriaProducto } from "../categoria-insumos/categoria_insumos.model.js";
import { filtros } from "../../utils/filtros.util.js";
import { Op } from "sequelize"

class MovimientosController {
    async get(req = request, res = response) {
        try {
            const { offset, limit, order } = filtros.obtenerFiltros({ busqueda: req.query.search, modelo: Movimiento, pagina: req.query.page })

            const where = {
                [Op.or]: [
                    { '$insumo.nombre$': { [Op.like]: `%${req.query.search ?? ""}%` } },
                    { '$insumo.descripcion$': { [Op.like]: `%${req.query.search ?? ""}%` } }
                ]
            };

            const movimientos = await Movimiento.findAll({
                offset, where, limit, order,
                include: {
                    model: Insumo,
                    as: "insumo",
                    attributes: ["nombre", "descripcion"],
                    include: {
                        model: CategoriaProducto,
                        attributes: ["avatar", "nombre"]
                    }
                }
            });

            const total = await Movimiento.count({ where, include: { model: Insumo, as: "insumo", attributes: [] } })

            return res.json({ movimientos, total });
        } catch (error) {
            return res.status(400).json({
                mensaje: error.message
            });
        }
    }

    async create(req = request, res = response) {
        const { insumoID, cantidad } = req.body;

        try {
            const insumo = await Insumo.findByPk(insumoID);
            if (!insumo) throw new Error("Ups, parece que no encontramos este id de insumo");

            if (cantidad <= 0) throw new Error("La cantidad del movimiento no puede ser igual o inferior a 0")
            if (cantidad > insumo.cantidad) throw new Error("Ups, este insumo no contiene tantas unidades")

            const movimiento = await Movimiento.create(req.body);


            await insumo.decrement({ cantidad })


            return res.status(201).json({ mensaje: "Movimiento registrado correctamente", movimiento });

        } catch (error) {
            return res.status(400).json({
                mensaje: error.message
            });
        }
    }
}

export const movimientosController = new MovimientosController();
