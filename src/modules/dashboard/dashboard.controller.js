import { Op, Sequelize } from "sequelize";
import { Cita } from "../citas/citas.model.js";
import { Compra } from "../compras/compras.model.js";
import { Proveedor } from "../proveedores/proveedores.model.js";
import { Barbero } from "../barberos/barberos.model.js";
import { Usuario } from "../usuarios/usuarios.model.js";
import { Rol } from "../roles/roles.model.js";
import { Servicio } from "../servicios/servicios.model.js";
import { Venta } from "../ventas/ventas.model.js";
import { format, subMonths, startOfMonth } from "date-fns";

export class DashboardController {
    get = async (req, res) => {
        try {
            /* ── últimos 8 meses ──────────────────────── */
            const monthsList = [...Array(8).keys()]
                .map(i => format(subMonths(startOfMonth(new Date()), i), "yyyy-MM"))
                .reverse();

            const monthMap = {
                "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
                "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
                "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
            };

            /* ──────────────────────────────────────────── */
            /* ── COMENTAR SECCIÓN DE VENTAS/COMPRAS ─────── */
            /* ──────────────────────────────────────────── */
            /*
            // Ventas por mes (comentado)
            const ventasPorMesRaw = await Cita.findAll({
                attributes: [
                    [Sequelize.fn("DATE_FORMAT", Sequelize.col("cita.fecha"), "%Y-%m"), "x"],
                    [Sequelize.fn("SUM", Sequelize.col("servicio.precio")), "y"],
                ],
                include: [{ model: Servicio, as: "servicio", attributes: [] }],
                where: {
                    estado: "Completa",
                    fecha: { [Op.between]: [subMonths(new Date(), 11), new Date()] },
                },
                group: ["x"],
                raw: true,
            });

            // Compras por mes (comentado)
            const comprasPorMesRaw = await Compra.findAll({
                attributes: [
                    [Sequelize.fn("DATE_FORMAT", Sequelize.col("compra.fecha"), "%Y-%m"), "x"],
                    [Sequelize.fn("SUM", Sequelize.col("compra.costo")), "y"],
                ],
                where: {
                    estaAnulado: false,
                    fecha: { [Op.between]: [subMonths(new Date(), 11), new Date()] },
                },
                group: ["x"],
                raw: true,
            });

            const toSerie = (raw, months) =>
                months.map(m => {
                    const r = raw.find(i => i.x === m) || { y: 0 };
                    return { x: monthMap[m.split("-")[1]], y: +r.y };
                });

            const ventasPorMes = toSerie(ventasPorMesRaw, monthsList);
            const comprasPorMes = toSerie(comprasPorMesRaw, monthsList);

            const ventasThis = ventasPorMes.at(-1).y;
            const ventasPrev = ventasPorMes.at(-2).y;
            const comprasThis = comprasPorMes.at(-1).y;
            const comprasPrev = comprasPorMes.at(-2).y;
            const profitThis = ventasThis - comprasThis;
            const profitPrev = ventasPrev - comprasPrev;

            const pct = (cur, prev) =>
                prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / Math.abs(prev)) * 100;

            const gananciasPorMes = ventasPorMes.slice(-4).map((v, i) => ({
                label: v.x,
                id: v.x,
                value: v.y - comprasPorMes.slice(-4)[i].y,
            }));
            */

            /* ── NUEVOS GRÁFICOS ──────────────────────── */
            
            // 1. Horas con más citas - BUSCAR EN VENTAS también
            const topHorasCitas = await Cita.findAll({
                attributes: [
                    "hora",
                    [Sequelize.fn("COUNT", Sequelize.col("cita.id")), "cantidad"], // ESPECIFICAR cita.id
                ],
                where: { 
                    estado: "Completa",
                    hora: { [Op.ne]: null }
                },
                group: ["hora"],
                order: [[Sequelize.literal("cantidad"), "DESC"]],
                limit: 6,
                raw: true,
            });

            const topHorasVentas = await Venta.findAll({
                attributes: [
                    "hora_cita",
                    [Sequelize.fn("COUNT", Sequelize.col("venta.id")), "cantidad"], // ESPECIFICAR venta.id
                ],
                where: { 
                    estado: "Completada",
                    hora_cita: { [Op.ne]: null }
                },
                group: ["hora_cita"],
                order: [[Sequelize.literal("cantidad"), "DESC"]],
                limit: 6,
                raw: true,
            });

            // Combinar resultados de citas y ventas
            const todasHoras = [...topHorasCitas, ...topHorasVentas];
            const horasAgrupadas = {};

            todasHoras.forEach(item => {
                const hora = item.hora || item.hora_cita;
                if (hora) {
                    if (!horasAgrupadas[hora]) {
                        horasAgrupadas[hora] = 0;
                    }
                    horasAgrupadas[hora] += parseInt(item.cantidad);
                }
            });

            const topHoras = Object.entries(horasAgrupadas)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([hora, cantidad]) => {
                    const [hh, mm] = hora.split(":");
                    const hour = ((+hh + 11) % 12) + 1;
                    const ampm = +hh >= 12 ? "PM" : "AM";
                    return { 
                        hora: hora,
                        label: `${hour}:${mm} ${ampm}`, 
                        value: cantidad 
                    };
                });

            // 2. Servicios más solicitados - BUSCAR EN VENTAS también
            const topServiciosCitas = await Cita.findAll({
                attributes: [
                    "servicioID",
                    [Sequelize.fn("COUNT", Sequelize.col("cita.id")), "cantidad"], // ESPECIFICAR cita.id
                ],
                where: { estado: "Completa" },
                include: [{ 
                    model: Servicio, 
                    as: "servicio", 
                    attributes: ["id", "nombre", "precio"] 
                }],
                group: ["servicioID"],
                order: [[Sequelize.literal("cantidad"), "DESC"]],
                limit: 8,
                raw: true,
                nest: true,
            });

            const topServiciosVentas = await Venta.findAll({
                attributes: [
                    "servicioID",
                    [Sequelize.fn("COUNT", Sequelize.col("venta.id")), "cantidad"], // ESPECIFICAR venta.id
                ],
                where: { estado: "Completada" },
                group: ["servicioID"],
                order: [[Sequelize.literal("cantidad"), "DESC"]],
                limit: 8,
                raw: true,
            });

            // Obtener detalles de servicios para las ventas
            const serviciosVentasDetalles = await Promise.all(
                topServiciosVentas.map(async (venta) => {
                    const servicio = await Servicio.findByPk(venta.servicioID);
                    return {
                        servicio: servicio ? servicio.toJSON() : { nombre: 'Servicio eliminado', precio: 0 },
                        cantidad: venta.cantidad
                    };
                })
            );

            const todosServicios = [
                ...topServiciosCitas.map(s => ({
                    servicio: s.servicio,
                    cantidad: s.cantidad
                })),
                ...serviciosVentasDetalles
            ];

            const serviciosAgrupados = {};
            todosServicios.forEach(item => {
                const servicioId = item.servicio.id;
                if (!serviciosAgrupados[servicioId]) {
                    serviciosAgrupados[servicioId] = {
                        servicio: item.servicio,
                        cantidad: 0
                    };
                }
                serviciosAgrupados[servicioId].cantidad += parseInt(item.cantidad);
            });

            const topServicios = Object.values(serviciosAgrupados)
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 8)
                .map(item => ({ 
                    id: item.servicio.id,
                    label: item.servicio.nombre,
                    value: item.cantidad,
                    precio: item.servicio.precio
                }));

            // 3. Tipos de usuarios (Pie chart) - SIN CAMBIOS
            const tiposDeUsuarios = (
                await Usuario.findAll({
                    attributes: [
                        [Sequelize.fn("COUNT", Sequelize.col("usuario.id")), "cantidad"], // ESPECIFICAR usuario.id
                        "rolID",
                    ],
                    where: { estaVerificado: true },
                    include: [
                        {
                            model: Rol,
                            as: "rol",
                            attributes: ["nombre"],
                        },
                    ],
                    group: ["rolID", "rol.id"],
                    raw: true,
                    nest: true,
                })
            ).map(r => ({
                id: r.rol.nombre,
                label: r.rol.nombre,
                value: r.cantidad,
                color: this.getRandomColor()
            }));

            // Calcular total de usuarios verificados
            const totalUsuarios = tiposDeUsuarios.reduce((sum, item) => sum + item.value, 0);

            // 4. Top barberos (por citas atendidas) - BUSCAR EN VENTAS también
            const topBarberosCitas = await Cita.findAll({
                attributes: [
                    "barberoID",
                    [Sequelize.fn("COUNT", Sequelize.col("cita.id")), "citasAtendidas"], // ESPECIFICAR cita.id
                ],
                where: { estado: "Completa" },
                include: [{ 
                    model: Barbero, 
                    as: "barbero", 
                    attributes: ["id", "nombre", "avatar"] 
                }],
                group: ["barberoID"],
                order: [[Sequelize.literal("citasAtendidas"), "DESC"]],
                limit: 5,
                raw: true,
                nest: true,
            });

            const topBarberosVentas = await Venta.findAll({
                attributes: [
                    "barberoID",
                    [Sequelize.fn("COUNT", Sequelize.col("venta.id")), "citasAtendidas"], // ESPECIFICAR venta.id
                ],
                where: { estado: "Completada" },
                group: ["barberoID"],
                order: [[Sequelize.literal("citasAtendidas"), "DESC"]],
                limit: 5,
                raw: true,
            });

            // Obtener detalles de barberos para las ventas
            const barberosVentasDetalles = await Promise.all(
                topBarberosVentas.map(async (venta) => {
                    const barbero = await Barbero.findByPk(venta.barberoID);
                    return {
                        barbero: barbero ? barbero.toJSON() : { nombre: 'Barbero eliminado', avatar: null },
                        citasAtendidas: venta.citasAtendidas
                    };
                })
            );

            const todosBarberos = [
                ...topBarberosCitas.map(b => ({
                    barbero: b.barbero,
                    citasAtendidas: b.citasAtendidas
                })),
                ...barberosVentasDetalles
            ];

            const barberosAgrupados = {};
            todosBarberos.forEach(item => {
                const barberoId = item.barbero.id;
                if (!barberosAgrupados[barberoId]) {
                    barberosAgrupados[barberoId] = {
                        barbero: item.barbero,
                        citasAtendidas: 0
                    };
                }
                barberosAgrupados[barberoId].citasAtendidas += parseInt(item.citasAtendidas);
            });

            const topBarberos = Object.values(barberosAgrupados)
                .sort((a, b) => b.citasAtendidas - a.citasAtendidas)
                .slice(0, 5)
                .map(item => ({
                    id: item.barbero.id,
                    nombre: item.barbero.nombre,
                    citas: item.citasAtendidas,
                    avatar: item.barbero.avatar
                }));

            // 5. Citas completadas totales (sumar citas + ventas)
            const citasCompletadasCount = await Cita.count({ 
                where: { estado: "Completa" } 
            });
            
            const ventasCompletadasCount = await Venta.count({ 
                where: { estado: "Completada" } 
            });

            const citasCompletadasTotales = citasCompletadasCount + ventasCompletadasCount;

            /* ── Respuesta ─────────────────────────────── */
            return res.json({
                // Datos comentados (se pueden descomentar luego)
                /*
                ventasEsteMes: ventasThis,
                comprasEsteMes: comprasThis,
                profitEsteMes: profitThis,
                ventasPorMes,
                comprasPorMes,
                gananciasPorMes,
                ventasChange: pct(ventasThis, ventasPrev),
                comprasChange: pct(comprasThis, comprasPrev),
                profitChange: pct(profitThis, profitPrev),
                */
                
                // Nuevos gráficos
                topHoras,
                topServicios,
                tiposDeUsuarios,
                totalUsuarios,
                topBarberos,
                
                // Mantener otros datos necesarios
                citasCompletadasTotales
            });
        } catch (err) {
            console.error("💥 Dashboard error:", err);
            return res.status(500).json({ 
                error: "Internal Server Error",
                message: err.message 
            });
        }
    };

    // Función auxiliar para generar colores aleatorios
    getRandomColor() {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

export const dashboardController = new DashboardController();