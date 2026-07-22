import { Op } from "sequelize";

class Filtros {
    obtenerFiltros({ pagina, busqueda, modelo }) {
        const page = isNaN(pagina) || !pagina ? 1 : Number(pagina);
        const offset = (page - 1) * 5;
        const search = busqueda ?? ""

        const campos = Object.keys(modelo.rawAttributes);

        const where = {
            [Op.or]: campos.map(field => ({
                [field]: {
                    [Op.like]: `%${search}%`
                }
            }))
        };

        const order = [['createdAt', 'DESC']]

        const limit = 5

        return { offset, where, limit, order }
    }
}

export const filtros = new Filtros()