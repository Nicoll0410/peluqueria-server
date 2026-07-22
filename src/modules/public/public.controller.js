import { Op, Sequelize } from 'sequelize';
import { Cita } from "../citas/citas.model.js";
import { Compra } from "../compras/compras.model.js";
import { Proveedor } from "../proveedores/proveedores.model.js";
import { Barbero } from "../barberos/barberos.model.js";
import { Usuario } from "../usuarios/usuarios.model.js";
import { Rol } from "../roles/roles.model.js";
import { Servicio } from '../servicios/servicios.model.js';

export class PublicController {

    getServices = async (req, res) => {
        try {
            const search = req.query.search ?? ""
            const campos = Object.keys(Servicio.rawAttributes);


            const where = {
                [Op.or]: campos.map(field => ({
                    [field]: {
                        [Op.like]: `%${search}%`
                    }
                }))
            };


            const servicios = await Servicio.findAll({ where })

            return res.json({
                servicios
            });

        } catch (error) {
            console.log({ error });

            return res.status(500).json({ error: error.message });
        }
    }

    getPopularServices = async (req, res) => {
        try {

            const servicios = (await Cita.findAll({
                attributes: [
                    'servicioID',
                    [Sequelize.fn('count', Sequelize.col('servicio.id')), 'value']
                ],
                include: [{
                    model: Servicio,
                    // attributes: [],
                    as: "servicio",
                }],
                group: ['servicioID', 'servicio.id'],
                order: [[Sequelize.fn('count', Sequelize.col('servicio.id')), 'DESC']],
                limit: 4
            }))



            return res.json({
                servicios
            });

        } catch (error) {
            console.log({ error });

            return res.status(500).json({ error: error.message });
        }
    }

}

export const publicController = new PublicController();