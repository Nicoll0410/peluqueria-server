import { response, request } from "express";
import { Cita } from "./citas.model.js";
import { Servicio } from "../servicios/servicios.model.js";
import { ServiciosPorInsumos } from "../servicios/servicios_insumos.model.js";
import { Barbero } from "../barberos/barberos.model.js";
import { Cliente } from "../clientes/clientes.model.js";
import { Usuario } from "../usuarios/usuarios.model.js";
import { Rol } from "../roles/roles.model.js";
import { filtros } from "../../utils/filtros.util.js";
import { BOOLEAN, literal, Op } from "sequelize";
import {
  add,
  addHours,
  isSaturday,
  isSunday,
  isToday,
  parse,
  parseISO,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "mysql2";
import { correos } from "../../utils/correos.util.js";
import { sendEmail } from "../../utils/send-email.util.js";
import jwt from "jsonwebtoken";
import { Insumo } from "../insumos/insumos.model.js";
import { sequelize } from "../../database.js";
import notificationsController from "../notifications/notifications.controller.js";
import { Notificacion } from "../notifications/notifications.model.js";
import { es } from "date-fns/locale";

class CitasController {
  async get(req = request, res = response) {
    try {
      async function obtenerIdsRelacionados(Modelo, search) {
        const registros = await Modelo.findAll({
          attributes: ["id"],
          where: {
            [Op.or]: [
              {
                nombre: {
                  [Op.like]: `%${search}%`,
                },
              },
            ],
          },
        });
        return registros.map((registro) => registro["id"]);
      }

      const idsServicio = await obtenerIdsRelacionados(
        Servicio,
        req.query.search
      );
      const idsCliente = await obtenerIdsRelacionados(
        Cliente,
        req.query.search
      );
      const idsBarbero = await obtenerIdsRelacionados(
        Barbero,
        req.query.search
      );

      const allIds = Array.from(
        new Set([...idsServicio, ...idsCliente, ...idsBarbero])
      );

      const params = filtros.obtenerFiltros({
        busqueda: req.query.search,
        modelo: Cita,
        pagina: req.query.page,
      });

      const whereConditions = params.where[Op.or];

      if (allIds.length > 0) {
        whereConditions.push({
          [Op.or]: [
            { servicioID: { [Op.in]: idsServicio } },
            { pacienteID: { [Op.in]: idsCliente } },
            { barberoID: { [Op.in]: idsBarbero } },
          ],
        });
      }

      const queryOptions = {
        order: [["fecha", "DESC"]],
        where: {
          [Op.or]: whereConditions,
          estado: {
            [Op.in]: [
              "Pendiente",
              "Confirmada",
              "Completa",
              "Expirada",
              "Cancelada",
            ],
          },
        },
        include: [
          {
            model: Servicio,
            as: "servicio",
            required: false,
            attributes: [
              "nombre",
              "descripcion",
              "duracionMaxima",
              "duracionRedondeada",
            ],
          },
          {
            model: Cliente,
            as: "cliente",
            required: false,
            attributes: ["nombre", "avatar", "telefono"],
          },
          {
            model: Barbero,
            as: "barbero",
            required: false,
            attributes: ["nombre", "avatar"],
          },
        ],
      };

      if (req.query.all === "true") {
        const citas = await Cita.findAll(queryOptions);
        return res.json({ citas });
      } else {
        const citas = await Cita.findAll({
          ...params,
          ...queryOptions,
        });
        const total = await Cita.count({ ...params });
        return res.json({ citas, total });
      }
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getAll(req = request, res = response) {
    try {
      async function obtenerIdsRelacionados(Modelo, search) {
        const registros = await Modelo.findAll({
          attributes: ["id"],
          where: {
            [Op.or]: [
              {
                nombre: {
                  [Op.like]: `%${search}%`,
                },
              },
            ],
          },
        });
        return registros.map((registro) => registro["id"]);
      }

      const idsServicio = await obtenerIdsRelacionados(
        Servicio,
        req.query.search
      );
      const idsCliente = await obtenerIdsRelacionados(
        Cliente,
        req.query.search
      );
      const idsBarbero = await obtenerIdsRelacionados(
        Barbero,
        req.query.search
      );

      const allIds = Array.from(
        new Set([...idsServicio, ...idsCliente, ...idsBarbero])
      );

      const params = filtros.obtenerFiltros({
        busqueda: req.query.search,
        modelo: Cita,
      });

      const whereConditions = params.where[Op.or];

      if (allIds.length > 0) {
        whereConditions.push({
          [Op.or]: [
            { servicioID: { [Op.in]: idsServicio } },
            { pacienteID: { [Op.in]: idsCliente } },
            { barberoID: { [Op.in]: idsBarbero } },
          ],
        });
      }

      const citas = await Cita.findAll({
        ...params,
        order: [["fecha", "DESC"]],
        where: { [Op.or]: whereConditions },
        include: [
          {
            model: Servicio,
            as: "servicio",
            required: false,
            attributes: ["nombre", "descripcion", "duracionMaxima"],
          },
          {
            model: Cliente,
            as: "cliente",
            required: false,
            attributes: ["nombre", "avatar", "telefono"],
          },
          {
            model: Barbero,
            as: "barbero",
            required: false,
            attributes: ["nombre", "avatar"],
          },
        ],
      });

      const total = await Cita.count({ ...params });
      return res.json({ citas, total });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getByBarberID(req = request, res = response) {
    try {
      const authHeader = req.header("Authorization");
      if (!authHeader)
        throw new Error("¡Ups! Parece que no tienes una sesión activa");
      if (!authHeader.startsWith("Bearer "))
        throw new Error("Formato del token invalido");

      const token = authHeader.split(" ")[1];
      const { email } = jwt.decode(token);
      const usuario = await Usuario.findOne({ where: { email } });
      const barbero = await Barbero.findOne({
        where: { usuarioID: usuario.id },
      });

      const obtenerIdsRelacionados = async (Modelo, search) => {
        const registros = await Modelo.findAll({
          attributes: ["id"],
          where: {
            [Op.or]: [{ nombre: { [Op.like]: `%${search}%` } }],
          },
        });
        return registros.map((r) => r.id);
      };

      const idsServicio = await obtenerIdsRelacionados(
        Servicio,
        req.query.search
      );
      const idsCliente = await obtenerIdsRelacionados(
        Cliente,
        req.query.search
      );
      const idsBarbero = await obtenerIdsRelacionados(
        Barbero,
        req.query.search
      );

      const allIds = Array.from(
        new Set([...idsServicio, ...idsCliente, ...idsBarbero])
      );

      const params = filtros.obtenerFiltros({
        busqueda: req.query.search,
        modelo: Cita,
        pagina: req.query.page,
      });

      const whereConditions = params.where[Op.or];

      if (allIds.length) {
        whereConditions.push({
          [Op.or]: [
            { servicioID: { [Op.in]: idsServicio } },
            { pacienteID: { [Op.in]: idsCliente } },
            { barberoID: { [Op.in]: idsBarbero } },
          ],
        });
      }

      const baseQuery = {
        order: [["fecha", "DESC"]],
        where: {
          [Op.or]: whereConditions,
          barberoID: barbero.id,
        },
        include: [
          {
            model: Servicio,
            as: "servicio",
            required: false,
            attributes: ["nombre", "descripcion", "duracionMaxima"],
          },
          {
            model: Cliente,
            as: "cliente",
            required: false,
            attributes: ["nombre", "avatar", "telefono"],
          },
          {
            model: Barbero,
            as: "barbero",
            required: false,
            attributes: ["nombre", "avatar"],
          },
        ],
      };

      if (req.query.all === "true") {
        const citas = await Cita.findAll(baseQuery);
        return res.json({ citas });
      }

      const citas = await Cita.findAll({
        ...params,
        ...baseQuery,
      });
      const total = await Cita.count({
        ...params,
        where: baseQuery.where,
      });

      return res.json({ citas, total });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getSells(req = request, res = response) {
    try {
      async function obtenerIdsRelacionados(Modelo, search) {
        const registros = await Modelo.findAll({
          attributes: ["id"],
          where: {
            [Op.or]: [
              {
                nombre: {
                  [Op.like]: `%${search}%`,
                },
              },
            ],
          },
        });
        return registros.map((registro) => registro["id"]);
      }

      const idsServicio = await obtenerIdsRelacionados(
        Servicio,
        req.query.search
      );
      const idsCliente = await obtenerIdsRelacionados(
        Cliente,
        req.query.search
      );
      const idsBarbero = await obtenerIdsRelacionados(
        Barbero,
        req.query.search
      );

      const allIds = Array.from(
        new Set([...idsServicio, ...idsCliente, ...idsBarbero])
      );

      const params = filtros.obtenerFiltros({
        busqueda: req.query.search,
        modelo: Cita,
        pagina: req.query.page,
      });

      const whereConditions = params.where[Op.or];

      if (allIds.length > 0) {
        whereConditions.push({
          [Op.or]: [
            { servicioID: { [Op.in]: idsServicio } },
            { pacienteID: { [Op.in]: idsCliente } },
            { barberoID: { [Op.in]: idsBarbero } },
          ],
        });
      }

      const citas = await Cita.findAll({
        ...params,
        order: [["fecha", "DESC"]],
        where: {
          [Op.or]: whereConditions,
          estado: "Completa",
        },
        include: [
          {
            model: Servicio,
            as: "servicio",
            required: false,
            attributes: ["nombre", "descripcion", "duracionMaxima", "precio"],
          },
          {
            model: Cliente,
            as: "cliente",
            required: false,
            attributes: ["nombre", "avatar", "telefono"],
          },
          {
            model: Barbero,
            as: "barbero",
            required: false,
            attributes: ["nombre", "avatar"],
          },
        ],
      });

      const total = await Cita.count({
        ...params,
        where: {
          [Op.or]: whereConditions,
          estado: "Completa",
        },
      });

      return res.json({ citas, total });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getInformationToCreate(req = request, res = response) {
    try {
      const servicios = await Servicio.findAll();
      const barberos = await Barbero.findAll({
        include: {
          model: Usuario,
          required: true,
          attributes: [],
          where: { estaVerificado: true },
          include: {
            model: Rol,
            as: "rol",
            where: { nombre: "Barbero" },
            required: true,
            attributes: [],
          },
        },
      });

      const clientes = await Cliente.findAll({
        include: {
          model: Usuario,
          required: true,
          attributes: [],
          where: { estaVerificado: true },
          include: {
            model: Rol,
            as: "rol",
            where: { nombre: "Cliente" },
            required: true,
            attributes: [],
          },
        },
      });

      return res.status(200).json({
        clientes,
        barberos,
        servicios,
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  // ✅ NUEVO: CREATE CON MULTISERVICIOS
  async create(req = request, res = response) {
    const t = await sequelize.transaction();
    try {
      console.log(
        "Datos recibidos para crear cita:",
        JSON.stringify(req.body, null, 2)
      );

      const { barberoID, fecha, hora, servicios: serviciosArray } = req.body;

      // ✅ Validar campos requeridos
      if (!barberoID || !fecha || !hora) {
        await t.rollback();
        return res.status(400).json({
          mensaje: "Faltan campos requeridos: barberoID, fecha, hora",
        });
      }

      // ✅ Obtener barbero
      const barbero = await Barbero.findByPk(barberoID, {
        include: [{ model: Usuario, as: "usuario" }],
        transaction: t,
      });
      if (!barbero) {
        await t.rollback();
        return res.status(404).json({ mensaje: "Barbero no encontrado" });
      }

      // ✅ ACEPTAR servicios múltiples o servicio único
      let serviciosSeleccionados = [];

      if (serviciosArray && Array.isArray(serviciosArray) && serviciosArray.length > 0) {
        // ✅ NUEVO: Múltiples servicios
        serviciosSeleccionados = [];
        for (const serv of serviciosArray) {
          const servicioEncontrado = await Servicio.findByPk(serv.id, { transaction: t });
          if (servicioEncontrado) {
            serviciosSeleccionados.push(servicioEncontrado);
          }
        }
      } else if (req.body.servicioID) {
        // ✅ VIEJO: Un solo servicio
        const servicioUnico = await Servicio.findByPk(req.body.servicioID, { transaction: t });
        if (servicioUnico) {
          serviciosSeleccionados = [servicioUnico];
        }
      }

      if (serviciosSeleccionados.length === 0) {
        await t.rollback();
        return res.status(400).json({ mensaje: "Se requiere al menos un servicio" });
      }

      // ✅ CALCULAR DURACIÓN Y PRECIO TOTAL
      let duracionTotalMinutos = 0;
      let precioTotal = 0;
      const serviciosInfo = [];

      for (const serv of serviciosSeleccionados) {
        const [h, m] = (serv.duracionMaxima || "00:30:00").split(":").map(Number);
        const minutosServicio = h * 60 + m;
        duracionTotalMinutos += minutosServicio;
        precioTotal += Number(serv.precio || 0);
        serviciosInfo.push({
          id: serv.id,
          nombre: serv.nombre,
          duracionMaxima: serv.duracionMaxima,
          precio: serv.precio
        });
      }

      // ✅ NORMALIZAR HORA DE INICIO
      let horaInicio = hora;
      if (!horaInicio.includes(":")) {
        horaInicio = `${horaInicio}:00`;
      } else if (horaInicio.split(":").length === 2) {
        horaInicio = `${horaInicio}:00`;
      }

      // ✅ CALCULAR HORA FIN
      const [horaH, horaM] = horaInicio.split(":").map(Number);
      const totalMinutosInicio = horaH * 60 + horaM + duracionTotalMinutos;
      const horaFinH = Math.floor(totalMinutosInicio / 60);
      const horaFinM = totalMinutosInicio % 60;
      const horaFinFormatted = `${horaFinH.toString().padStart(2, "0")}:${horaFinM.toString().padStart(2, "0")}:00`;

      // ✅ VERIFICAR CONFLICTOS DE HORARIO
      const citasSolapadas = await Cita.findAll({
        where: {
          barberoID,
          fecha,
          estado: { [Op.notIn]: ["Cancelada", "Expirada"] },
        },
        transaction: t,
      });

      const inicioMinutos = horaH * 60 + horaM;
      const finMinutos = horaFinH * 60 + horaFinM;

      const tieneConflicto = citasSolapadas.some((cita) => {
        const [citaHoraH, citaHoraM] = cita.hora.split(":").map(Number);
        const [citaHoraFinH, citaHoraFinM] = cita.horaFin.split(":").map(Number);
        const citaInicioMin = citaHoraH * 60 + citaHoraM;
        const citaFinMin = citaHoraFinH * 60 + citaHoraFinM;

        return (
          (inicioMinutos >= citaInicioMin && inicioMinutos < citaFinMin) ||
          (finMinutos > citaInicioMin && finMinutos <= citaFinMin) ||
          (inicioMinutos <= citaInicioMin && finMinutos >= citaFinMin)
        );
      });

      if (tieneConflicto) {
        await t.rollback();
        return res.status(400).json({
          mensaje: "El estilista ya tiene citas en ese horario",
        });
      }

      // ✅ VALIDAR PACIENTE
      if (!req.body.pacienteID && !req.body.pacienteTemporalNombre) {
        await t.rollback();
        return res.status(400).json({
          mensaje: "Se requiere pacienteID o pacienteTemporalNombre",
        });
      }

      // ✅ CREAR CITA
      const nuevaCita = {
        servicioID: serviciosSeleccionados[0].id, // Servicio principal
        serviciosAdicionales: serviciosInfo.slice(1), // Servicios adicionales
        barberoID,
        fecha,
        hora: horaInicio,
        horaFin: horaFinFormatted,
        duracionReal: `${Math.floor(duracionTotalMinutos / 60)}:${(duracionTotalMinutos % 60).toString().padStart(2, "0")}:00`,
        duracionRedondeada: `${Math.ceil(duracionTotalMinutos / 30) * 30 / 60}:00:00`,
        precioTotal,
        estado: "Confirmada",
        direccion: req.body.direccion || "En el salón",
      };

      if (req.body.pacienteID) {
        const cliente = await Cliente.findByPk(req.body.pacienteID, { transaction: t });
        if (!cliente) {
          await t.rollback();
          return res.status(404).json({ mensaje: "Cliente no encontrado" });
        }
        nuevaCita.pacienteID = req.body.pacienteID;
      } else {
        nuevaCita.pacienteTemporalNombre = req.body.pacienteTemporalNombre.trim();
        if (req.body.pacienteTemporalTelefono) {
          nuevaCita.pacienteTemporalTelefono = req.body.pacienteTemporalTelefono.trim();
        }
      }

      const datosFinales = { ...nuevaCita };
      if (datosFinales.pacienteID === null || datosFinales.pacienteID === undefined) {
        delete datosFinales.pacienteID;
      }

      const citaCreada = await Cita.create(datosFinales, { transaction: t });

      // 👇 NUEVO: Enviar notificaciones en tiempo real
      try {
        const usuarioCreador = await Usuario.findByPk(req.user.id, {
          include: [{ model: Rol, as: 'rol' }],
          transaction: t
        });
        
        // Obtener instancia de io
        const io = req.app.get("io");
        
        // Determinar destinatarios según el rol del creador
        let destinatarios = [];
        
        if (usuarioCreador.rol.nombre === 'administrador') {
          // Admin crea -> notificar a barbero y cliente
          if (citaCreada.barberoID) destinatarios.push(citaCreada.barberoID);
          if (citaCreada.pacienteID) destinatarios.push(citaCreada.pacienteID);
        } 
        else if (usuarioCreador.rol.nombre === 'barbero') {
          // Barbero crea -> notificar a admins y cliente
          const administradores = await Usuario.findAll({
            include: [{
              model: Rol,
              as: 'rol',
              where: { nombre: 'administrador' }
            }],
            transaction: t
          });
          destinatarios = administradores.map(admin => admin.id);
          if (citaCreada.pacienteID) destinatarios.push(citaCreada.pacienteID);
        } 
        else if (usuarioCreador.rol.nombre === 'cliente') {
          // Cliente crea -> notificar a barbero y admins
          if (citaCreada.barberoID) destinatarios.push(citaCreada.barberoID);
          const administradores = await Usuario.findAll({
            include: [{
              model: Rol,
              as: 'rol',
              where: { nombre: 'administrador' }
            }],
            transaction: t
          });
          destinatarios = [...destinatarios, ...administradores.map(admin => admin.id)];
        }

        // Eliminar duplicados y al creador de la notificación
        destinatarios = [...new Set(destinatarios)].filter(id => id !== usuarioCreador.id);

        // Obtener información completa para la notificación
        const citaCompleta = await Cita.findByPk(citaCreada.id, {
          include: [
            { model: Servicio, as: 'servicio' },
            { model: Barbero, as: 'barbero' },
            { model: Cliente, as: 'cliente' }
          ],
          transaction: t
        });

        // Crear mensaje de notificación
        const fechaFormateada = new Date(citaCompleta.fecha).toLocaleDateString("es-ES");
        const mensaje = `Nueva cita: ${citaCompleta.servicio?.nombre} - ${fechaFormateada} ${citaCompleta.hora}`;

        // Enviar notificación a cada destinatario
        for (const destinatarioId of destinatarios) {
          // Crear notificación en BD
          const notificacion = await Notificacion.create({
            usuarioID: destinatarioId,
            titulo: '📅 Nueva Cita',
            cuerpo: mensaje,
            tipo: 'cita_creada',
            relacionId: citaCreada.id,
            leido: false
          }, { transaction: t });

          // Emitir evento Socket.io
          io.to(`usuario_${destinatarioId}`).emit('nueva_notificacion', {
            ...notificacion.toJSON(),
            sound: true,
            cita: citaCompleta
          });

          // Enviar push notification si tiene token
          const usuarioDestino = await Usuario.findByPk(destinatarioId, {
            transaction: t
          });
          
          if (usuarioDestino && usuarioDestino.expo_push_token) {
            await notificationsController.sendPushNotification({
              userId: destinatarioId,
              titulo: '📅 Nueva Cita',
              cuerpo: mensaje,
              data: {
                type: "cita",
                citaId: citaCreada.id,
                screen: "DetalleCita"
              }
            });
          }
        }

      } catch (notifError) {
        console.error("❌ Error en notificaciones:", notifError);
        // No hacer rollback por error en notificaciones
      }

      try {
        const barberoConEmail = await Barbero.findByPk(req.body.barberoID, {
          include: [{ model: Usuario, as: "usuario" }],
          transaction: t
        });
        
        const servicioInfo = serviciosSeleccionados[0];
        
        let clienteNombre = "";
        if (req.body.pacienteID) {
          const clienteInfo = await Cliente.findByPk(req.body.pacienteID, {
            transaction: t
          });
          clienteNombre = clienteInfo.nombre;
        } else {
          clienteNombre = req.body.pacienteTemporalNombre;
        }

        if (barberoConEmail && barberoConEmail.usuario && barberoConEmail.usuario.email) {
          const fechaHora = new Date(`${req.body.fecha}T${hora}`);
          
          const emailContent = correos.notificacionCitaBarbero({
            tipo: 'creacion',
            cliente_nombre: clienteNombre,
            fecha_hora: fechaHora,
            servicio_nombre: servicioInfo.nombre
          });
          
          await sendEmail({
            to: barberoConEmail.usuario.email,
            subject: 'Nueva cita agendada - Sala de belleza Alba',
            html: emailContent
          });
        }
      } catch (emailError) {
        console.error('❌ Error al enviar email de notificación:', emailError);
      }

      // ✅ NUEVO: ACTUALIZAR BADGES EN TIEMPO REAL PARA BARBERO Y CLIENTE
      try {
        const io = req.app.get("io");
        
        // Obtener usuario del barbero
        let barberoUsuarioId = null;
        const barberoConUsuario = await Barbero.findByPk(req.body.barberoID, {
          include: [{ model: Usuario, as: "usuario" }],
          transaction: t
        });
        if (barberoConUsuario && barberoConUsuario.usuario) {
          barberoUsuarioId = barberoConUsuario.usuario.id;
          console.log("👨‍💼 Barbero usuario ID:", barberoUsuarioId);
        }
        
        // Obtener usuario del cliente (si existe)
        let clienteUsuarioId = null;
        if (req.body.pacienteID) {
          const clienteConUsuario = await Cliente.findByPk(req.body.pacienteID, {
            include: [{ model: Usuario, as: "usuario" }],
            transaction: t
          });
          if (clienteConUsuario && clienteConUsuario.usuario) {
            clienteUsuarioId = clienteConUsuario.usuario.id;
            console.log("👤 Cliente usuario ID:", clienteUsuarioId);
          }
        }
        
        // Emitir eventos para actualizar badges
        if (barberoUsuarioId) {
          console.log("📤 Emitiendo actualizar_badge para barbero:", barberoUsuarioId);
          io.to(`usuario_${barberoUsuarioId}`).emit("actualizar_badge", {
            usuarioID: barberoUsuarioId,
            incrementar: true,
            cantidad: 1,
            timestamp: new Date().toISOString(),
          });
        }
        
        if (clienteUsuarioId) {
          console.log("📤 Emitiendo actualizar_badge para cliente:", clienteUsuarioId);
          io.to(`usuario_${clienteUsuarioId}`).emit("actualizar_badge", {
            usuarioID: clienteUsuarioId,
            incrementar: true,
            cantidad: 1,
            timestamp: new Date().toISOString()
          });
        }
          // También emitir broadcast general por si acaso
  io.emit("actualizar_badge", {
    broadcast: true,
    timestamp: new Date().toISOString()
  });
      } catch (socketError) {
        console.error("❌ Error emitiendo eventos socket:", socketError);
        // No hacer rollback por error de socket
      }

      await t.commit();

      return res.status(201).json({
        mensaje: "Cita creada exitosamente",
        cita: citaCreada,
      });
    } catch (error) {
      await t.rollback();
      console.error("Error completo al crear cita:", error);
      return res.status(500).json({
        mensaje: "Error interno al crear la cita",
        error: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  async createByPatient(req = request, res = response) {
    try {
      const authHeader = req.header("Authorization");
      if (!authHeader)
        throw new Error("¡Ups! Parece que no tienes una sesión activa");
      if (!authHeader.startsWith("Bearer "))
        throw new Error("Formato del token invalido");

      const token = authHeader.split(" ")[1];
      const { email } = jwt.decode(token);
      const usuario = await Usuario.findOne({ where: { email } });
      const cliente = await Cliente.findOne({
        where: { usuarioID: usuario.id },
      });

      const { duracionMaxima } = await Servicio.findByPk(req.body.servicioID, {
        attributes: ["duracionMaxima"],
      });

      const horaObj = parse(req.body.hora.toUpperCase(), "h:mm a", new Date());
      const [svcH, svcM, svcS] = duracionMaxima.split(":").map(Number);
      const horaFinObj = add(horaObj, {
        hours: svcH,
        minutes: svcM,
        seconds: svcS,
      });

      const hora = format(horaObj, "HH:mm:ss");
      const horaFin = format(horaFinObj, "HH:mm:ss");

      const cita = await Cita.create({
        ...req.body,
        pacienteID: cliente.id,
        direccion: req.body.direccion || "En barbería",
        hora,
        horaFin,
      });

      return res.status(201).json({
        mensaje: "Cita registrada correctamente",
        cita,
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async update(req = request, res = response) {
    try {
      const citaExiste = await Cita.findByPk(req.params.id);
      if (!citaExiste)
        throw new Error("Ups, parece que no encontramos esta cita");

      const datos = { ...req.body };

      if (datos.hora && datos.servicioID) {
        const { duracionMaxima } = await Servicio.findByPk(datos.servicioID, {
          attributes: ["duracionMaxima"],
        });

        if (duracionMaxima) {
          const horaObj = parse(datos.hora.toUpperCase(), "h:mm a", new Date());
          const [svcH, svcM, svcS] = duracionMaxima.split(":").map(Number);
          const horaFinObj = add(horaObj, {
            hours: svcH,
            minutes: svcM,
            seconds: svcS,
          });
          datos.hora = format(horaObj, "HH:mm:ss");
          datos.horaFin = format(horaFinObj, "HH:mm:ss");
        }
      }

      const citaActualizada = await citaExiste.update(datos);

      return res.json({
        mensaje: "Cita actualizada correctamente",
        citaActualizada,
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async delete(req = request, res = response) {
    try {
      const id = req.params.id;
      const cita = await Cita.findByPk(id);
      if (!cita) throw new Error("Ups, parece que no encontramos esta cita");

      const citaEliminada = await cita.destroy({
        where: { id },
      });

      return res.json({
        mensaje: "Cita eliminada correctamente",
        citaEliminada,
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getAvailabilityOfBarber(req = request, res = response) {
    try {
      const { servicioID, barberoID, fecha } = req.query;
      const fechaParsed = parseISO(fecha);

      if (isSaturday(fechaParsed) || isSunday(fechaParsed)) {
        return res.json([]);
      }

      const servicio = await Servicio.findOne({
        where: { id: servicioID },
        attributes: ["duracionMaxima", "duracionRedondeada"],
      });

      if (!servicio) {
        throw new Error("Servicio no encontrado");
      }

      const citasDelBarbero = await Cita.findAll({
        where: { barberoID, fecha },
        attributes: ["hora", "horaFin"],
      });

      const [hRed, mRed] = servicio.duracionRedondeada.split(":").map(Number);
      const duracionMaxima = hRed + mRed / 60;

      const citas = citasDelBarbero.map(({ hora, horaFin }) => ({
        horaInicial: convertirHoraAFraccion(hora),
        horaFinal: convertirHoraAFraccion(horaFin),
      }));

      const horasDisponibles = calcularHorasDisponibles(
        citas,
        duracionMaxima,
        fecha
      );

      return res.json(horasDisponibles);
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async confirmDate(req = request, res = response) {
    try {
      const { id } = req.params;
      const cita = await Cita.findByPk(id);
      if (!cita) throw new Error("Ups, no encontramos esta cita");

      const serviciosPorInsumo = await ServiciosPorInsumos.findAll({
        where: { servicioID: cita.servicioID },
      });

      serviciosPorInsumo.forEach(async ({ insumoID, unidades }) => {
        const insumo = await Insumo.findByPk(insumoID);
        await insumo.decrement({ cantidad: unidades });
        if (insumo.cantidad < 0) {
          insumo.cantidad = 0;
          insumo.save();
        }
      });

      await cita.update({ estado: "Completa" });

      return res.json({
        mensaje: "Cita confirmada correctamente",
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async expireDate(req = request, res = response) {
    try {
      const { id } = req.params;
      const cita = await Cita.findByPk(id);
      if (!cita) throw new Error("Ups, no encontramos esta cita");

      await cita.update({ estado: "Expirada" });

      return res.json({
        mensaje: "Cita expirada correctamente",
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async cancelDate(req = request, res = response) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const cita = await Cita.findByPk(id, {
        transaction: t,
        include: [
          {
            model: Barbero,
            as: "barbero",
            include: [{ model: Usuario, as: "usuario" }],
          },
        ],
      });

      if (!cita) {
        await t.rollback();
        return res.status(404).json({ mensaje: "Cita no encontrada" });
      }

      if (cita.estado === "Completa" || cita.estado === "Expirada") {
        await t.rollback();
        return res.status(400).json({
          mensaje: `No se puede cancelar una cita en estado ${cita.estado}`,
        });
      }

    // CORRECCIÓN: Crear fecha/hora de la cita considerando zona horaria
    const ahora = new Date();
    const fechaCita = new Date(`${cita.fecha}T${cita.hora}:00-05:00`); // ← Añadir zona horaria

    // CORRECCIÓN: Comparar con la hora actual considerando la diferencia
    const diferenciaMs = fechaCita.getTime() - ahora.getTime();
    const diferenciaMinutos = diferenciaMs / (1000 * 60);

    // Permitir cancelar hasta 5 minutos antes de la cita
    if (diferenciaMinutos < 5) {
      await t.rollback();
      return res.status(400).json({
        mensaje: "Solo se pueden cancelar citas con al menos 5 minutos de anticipación",
      });
    }

      await cita.update({ estado: "Cancelada" }, { transaction: t });

      try {
        await notificationsController.createAppointmentNotification(
          id,
          "cancelacion",
          { transaction: t }
        );
      } catch (notifError) {
        console.error(
          "Error al crear notificación de cancelación:",
          notifError
        );
      }

      try {
        let clienteNombre = "";
        if (cita.pacienteID) {
          clienteNombre = cita.cliente ? cita.cliente.nombre : "Cliente";
        } else {
          clienteNombre = cita.pacienteTemporalNombre || "Cliente temporal";
        }

        if (cita.barbero && cita.barbero.usuario && cita.barbero.usuario.email) {
          const fechaHora = new Date(`${cita.fecha}T${cita.hora}`);
          const motivo = req.body.motivo || "No especificado";
          
          const emailContent = correos.notificacionCitaBarbero({
            tipo: 'cancelacion',
            cliente_nombre: clienteNombre,
            fecha_hora: fechaHora,
            servicio_nombre: cita.servicio ? cita.servicio.nombre : "Servicio",
            motivo_cancelacion: motivo
          });
          
          await sendEmail({
            to: cita.barbero.usuario.email,
            subject: 'Cita cancelada - Barbería',
            html: emailContent
          });
        }
      } catch (emailError) {
        console.error('❌ Error al enviar email de cancelación:', emailError);
      }

      await t.commit();

      return res.json({
        mensaje:
          "Cita cancelada correctamente. El horario ahora está disponible.",
        cita,
      });
    } catch (error) {
      await t.rollback();
      console.error("Error en cancelDate:", error);
      return res.status(500).json({
        mensaje: "Error interno al cancelar la cita",
        error: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  async markAllAsRead(req = request, res = response) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ msg: "Se requiere el ID de usuario" });
      }

      await Notificacion.update(
        { leido: true },
        { where: { usuarioID: userId, leido: false } }
      );

      return res.json({ msg: "Todas las notificaciones marcadas como leídas" });
    } catch (error) {
      console.error("Error marcando notificaciones como leídas:", error);
      res.status(500).json({ msg: "Error en el servidor" });
    }
  }

  async getPatientDates(req = request, res = response) {
    try {
      const authHeader = req.header("Authorization");
      if (!authHeader)
        throw new Error("¡Ups! Parece que no tienes una sesión activa");
      if (!authHeader.startsWith("Bearer "))
        throw new Error("Formato del token invalido");

      const token = authHeader.split(" ")[1];
      const { email } = jwt.decode(token);
      const usuario = await Usuario.findOne({ where: { email } });
      const cliente = await Cliente.findOne({
        where: { usuarioID: usuario.id },
      });

      const citas = await Cita.findAll({
        where: { pacienteID: cliente.id },
        include: [
          {
            model: Cliente,
            as: "cliente",
            include: [
              {
                model: Usuario,
                as: "usuario",
              },
            ],
          },
          {
            model: Barbero,
            as: "barbero",
          },
          {
            model: Servicio,
            as: "servicio",
          },
        ],
        order: [
          [
            literal(
              "estado='Expirada', estado='Cancelada', estado='Completa', estado='Pendiente'"
            ),
          ],
          ["fecha", "ASC"],
          ["hora", "ASC"],
        ],
      });

      return res.json({
        citas,
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }

  async getDiary(req = request, res = response) {
    try {
      const { fecha } = req.query;
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return res.status(400).json({
          error: "Formato de fecha inválido. Use YYYY-MM-DD",
        });
      }

      const barberosBase = await Barbero.findAll({
        attributes: ["id", "nombre", "avatar"],
        order: [["nombre", "ASC"]],
      });

      const barberoMap = {};
      barberosBase.forEach((b) => {
        barberoMap[b.id] = {
          id: b.id,
          name: b.nombre,
          avatar: b.avatar,
          schedule: [],
        };
      });

      const citasDia = await Cita.findAll({
        where: { fecha },
        include: [
          {
            model: Barbero,
            as: "barbero",
            attributes: ["id", "nombre", "avatar"],
          },
          {
            model: Servicio,
            as: "servicio",
            attributes: ["id", "nombre", "duracionMaxima", "precio"],
          },
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "nombre", "telefono"],
            include: [{ model: Usuario, as: "usuario", attributes: ["email"] }],
          },
        ],
      });

      const toDecimal = (hms) => {
        const [h, m] = hms.split(":").map(Number);
        return h + m / 60;
      };

      citasDia.forEach((cita) => {
        const barberoID = cita.barbero?.id;
        if (!barberoID) return;

        const start = toDecimal(cita.hora);
        const duracionRaw = cita.servicio?.duracionMaxima || "01:00:00";
        const [dh, dm] = duracionRaw.split(":").map(Number);
        const end = start + dh + dm / 60;

        barberoMap[barberoID].schedule.push({
          id: cita.id,
          start,
          end,
          servicio: {
            id: cita.servicio?.id || null,
            nombre: cita.servicio?.nombre || "",
            duracion: duracionRaw,
            precio: cita.servicio?.precio || 0,
          },
          cliente: {
            id: cita.cliente?.id || null,
            nombre: cita.cliente?.nombre || cita.pacienteTemporalNombre || "",
            telefono:
              cita.cliente?.telefono || cita.pacienteTemporalTelefono || "",
            email: cita.cliente?.usuario?.email || "",
          },
          estado: cita.estado,
        });
      });

      return res.status(200).json(Object.values(barberoMap));
    } catch (error) {
      console.error("Error en getDiary:", error);
      return res.status(500).json({
        error: "Error al obtener el diario de citas",
        detalle:
          process.env.NODE_ENV === "development"
            ? { message: error.message, stack: error.stack }
            : null,
      });
    }
  }

  async getAvailableServices(req, res) {
    let { fecha, hora, barberoID } = req.query;
    hora = Number(hora);

    if (!fecha || !hora || !barberoID) {
      return res
        .status(400).json({ error: "fecha, hora y barberoID son requeridos" });
    }

    const hourDecimal = parseFloat(hora);
    const startHour =
      Math.floor(hourDecimal) >= 10
        ? Math.floor(hourDecimal)
        : "0" + Math.floor(hourDecimal);
    const startMinutes = (hourDecimal % 1) * 60;
    const startTime = `${startHour}:${
      startMinutes === 0 ? "00" : startMinutes
    }:00`;

    try {
      const citas = await Cita.findAll({
        where: {
          fecha,
          barberoID,
        },
        include: [
          {
            model: Servicio,
            as: "servicio",
          },
        ],
      });

      const barbero = await Barbero.findByPk(barberoID);
      const serviciosNoFiltrados = await Servicio.findAll();

      if (citas.length === 0) {
        const servicios = serviciosNoFiltrados.filter(({ duracionMaxima }) => {
          const duracion = convertirHoraAFraccion(duracionMaxima);
          const posibleHoraFinal = hora + duracion;
          return posibleHoraFinal <= 17;
        });

        return res.json({ servicios, barbero });
      }

      const servicios = serviciosNoFiltrados.filter(({ duracionMaxima }) => {
        const duracion = convertirHoraAFraccion(duracionMaxima);
        const posibleHoraFinal = hora + duracion;

        const noExisteConflicto = citas.every(
          ({ hora: horaInicio, horaFin }) => {
            const horaEnFraccion = convertirHoraAFraccion(horaInicio);
            const horaFinEnFraccion = convertirHoraAFraccion(horaFin);

            return (
              (posibleHoraFinal <= horaEnFraccion ||
                hora >= horaFinEnFraccion) &&
              posibleHoraFinal <= 17
            );
          }
        );

        return noExisteConflicto;
      });

      return res.status(200).json({ servicios, barbero });
    } catch (error) {
      console.log({ error });
      return res.status(400).json({
        mensaje: error.message,
      });
    }
  }
}

function redondearDuracion(duracionStr) {
  const [h, m] = duracionStr.split(":").map(Number);
  const totalMinutos = h * 60 + m;

  if (totalMinutos <= 30) return 30;
  if (totalMinutos <= 60) return 60;
  if (totalMinutos <= 90) return 90;
  return Math.ceil(totalMinutos / 30) * 30;
}

function convertirDuracionAHoras(duracion) {
  const [horas, minutos, segundos] = duracion.split(":").map(Number);
  return horas + minutos / 60 + segundos / 3600;
}

function convertirHoraAFraccion(hora) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas + minutos / 60;
}

function convertirHora24a12(hora24) {
  const [hora, minutos] = hora24.split(":").map(Number);
  const period = hora >= 12 ? "PM" : "AM";
  const hora12 = hora % 12 || 12;
  return `${hora12}:${minutos.toString().padStart(2, "0")} ${period}`;
}

function calcularHorasDisponibles(citas, duracionMaxima, fecha) {
  const horasDisponibles = [];
  const HORA_INICIAL = 8;
  let horaActual = HORA_INICIAL;
  const HORA_FINAL = 17;
  const TIEMPO_IMPREVISTOS = 1;
  const isProduction = process.env.ENVIRONMENT === "PROD";
  const esHoy = isToday(parseISO(fecha));

  if (esHoy) {
    horaActual = new Date().getHours() + TIEMPO_IMPREVISTOS * 2;
    if (isProduction) {
      horaActual += 5;
    }
  }

  while (horaActual < HORA_FINAL) {
    const horaFormateada = Number.isInteger(horaActual)
      ? convertirHora24a12(`${horaActual}:00`)
      : convertirHora24a12(
          `${Math.floor(horaActual)}:${(horaActual % 1) * 60}`
        );

    const tieneCita = citas.some(({ horaInicial, horaFinal }) => {
      return (
        (horaActual >= horaInicial - TIEMPO_IMPREVISTOS &&
          horaActual < horaFinal + TIEMPO_IMPREVISTOS) ||
        (horaActual + duracionMaxima > horaInicial - TIEMPO_IMPREVISTOS &&
          horaActual + duracionMaxima <= horaFinal + TIEMPO_IMPREVISTOS) ||
        (horaActual <= horaInicial - TIEMPO_IMPREVISTOS &&
          horaActual + duracionMaxima >= horaFinal + TIEMPO_IMPREVISTOS)
      );
    });

    if (!tieneCita && horaActual + duracionMaxima <= HORA_FINAL) {
      horasDisponibles.push(horaFormateada);
    }

    horaActual += 0.5;
  }

  return horasDisponibles;
}

export const citasController = new CitasController();