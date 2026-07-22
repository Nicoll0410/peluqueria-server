/* ────────────────────────────────────────────────────────────
   src/modules/servicios/servicios.controller.js
   Controlador completo y funcional – insumos ahora opcionales
   ──────────────────────────────────────────────────────────── */
import { request, response } from "express";
import { Servicio } from "./servicios.model.js";
import { filtros } from "../../utils/filtros.util.js";
import { ServiciosPorInsumos } from "./servicios_insumos.model.js";
import { CategoriaProducto } from "../categoria-insumos/categoria_insumos.model.js";
import { Insumo } from "../insumos/insumos.model.js";

class ServiciosController {
/* ───────────── Listar con filtros SIN paginación ───────────── */
async get(req = request, res = response) {
  try {
    const { where, order } = filtros.obtenerFiltros({
      busqueda: req.query.search,
      modelo: Servicio,
    });

    // Traer todos los servicios sin limit ni offset
    const servicios = await Servicio.findAll({ where, order });
    const total = servicios.length;

    return res.json({ servicios, total });
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
}


  /* ─────────────── Buscar uno por ID (incluye insumos) ─────────────── */
  async findByPk(req = request, res = response) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findByPk(id);
      const serviciosPorInsumo = await ServiciosPorInsumos.findAll({
        where: { servicioID: id },
        include: { model: Insumo, include: { model: CategoriaProducto } },
      });

      return res.json({ servicio, serviciosPorInsumo });
    } catch (error) {
      return res.status(400).json({ mensaje: error.message });
    }
  }

/* ─────────────── Crear ─────────────── */
async create(req = request, res = response) {
  try {
    // función auxiliar para asegurar formato TIME válido
    function toTimeFormat(timeString) {
      if (timeString.includes(":")) {
        // ya viene como "HH:MM" o "HH:MM:SS"
        const parts = timeString.split(":");
        const hours = parts[0].padStart(2, "0");
        const minutes = parts[1].padStart(2, "0");
        const seconds = parts[2] ? parts[2].padStart(2, "0") : "00";
        return `${hours}:${minutes}:${seconds}`;
      }
      throw new Error("Formato de duración inválido, usa HH:MM o HH:MM:SS");
    }

    /* ───── Validación de nombre único ───── */
    const existePorNombre = await Servicio.findOne({ where: { nombre: req.body.nombre } });
    if (existePorNombre) throw new Error("Ups, parece que ya existe un servicio con este nombre");

    /* ───── Convertir a formato TIME ───── */
    const duracionMaxima = toTimeFormat(req.body.duracionMaxima);
    const duracionMaximaConvertido = duracionMaxima; // mismo valor, TIME válido

    /* ───── Crear servicio ───── */
    const servicio = await Servicio.create({ 
      ...req.body, 
      duracionMaxima, 
      duracionMaximaConvertido 
    });

    /* ───── Crear insumos SOLO si se enviaron ───── */
    const insumosData = Array.isArray(req.body.insumos) ? req.body.insumos : [];
    if (insumosData.length > 0) {
      const serviciosPorInsumos = insumosData.map((insumo) => ({
        ...insumo,
        servicioID: servicio.id,
      }));
      await ServiciosPorInsumos.bulkCreate(serviciosPorInsumos);
    }

    return res.status(201).json({
      mensaje: "Servicio registrado correctamente",
      servicio,
    });
  } catch (error) {
    console.log({ error });
    return res.status(400).json({ mensaje: error.message });
  }
}


/* ─────────────── Actualizar (insumos opcionales) ─────────────── */
async update(req = request, res = response) {
  try {
    const servicioExiste = await Servicio.findByPk(req.params.id);
    if (!servicioExiste) throw new Error("Ups, parece que no encontramos este servicio");

    const existePorNombre = await Servicio.findOne({ where: { nombre: req.body.nombre } });
    if (existePorNombre && existePorNombre.id !== req.params.id)
      throw new Error("Ups, parece que ya existe un servicio con este nombre");

    // función auxiliar para TIME
    function toTimeFormat(timeString) {
      if (!timeString) return null;
      if (timeString.includes(":")) {
        const parts = timeString.split(":");
        const hours = parts[0].padStart(2, "0");
        const minutes = parts[1].padStart(2, "0");
        const seconds = parts[2] ? parts[2].padStart(2, "0") : "00";
        return `${hours}:${minutes}:${seconds}`;
      }
      throw new Error("Formato de duración inválido, usa HH:MM o HH:MM:SS");
    }

    // convertir si vienen en el body
    const updateData = {
      ...req.body,
    };
    if (req.body.duracionMaxima) {
      updateData.duracionMaxima = toTimeFormat(req.body.duracionMaxima);
      updateData.duracionMaximaConvertido = updateData.duracionMaxima;
    }

    /* ───── Actualizar datos principales ───── */
    const servicioActualizado = await servicioExiste.update(updateData);

    /* ───── Si se envía el array de insumos, se re-sincroniza ───── */
    if (Array.isArray(req.body.insumos)) {
      await ServiciosPorInsumos.destroy({ where: { servicioID: req.params.id } });

      if (req.body.insumos.length > 0) {
        const nuevosInsumos = req.body.insumos.map((insumo) => ({
          ...insumo,
          servicioID: servicioActualizado.id,
        }));
        await ServiciosPorInsumos.bulkCreate(nuevosInsumos);
      }
    }

    return res.json({
      mensaje: "Servicio actualizado correctamente",
      servicioActualizado,
    });
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
}


  /* ─────────────── Eliminar ─────────────── */
  async delete(req = request, res = response) {
    try {
      const { id } = req.params;
      const servicio = await Servicio.findByPk(id);
      if (!servicio) throw new Error("Ups, parece que no encontramos este servicio");

      await ServiciosPorInsumos.destroy({ where: { servicioID: id } });
      const servicioEliminado = await servicio.destroy();

      return res.json({ mensaje: "Servicio eliminado correctamente", servicioEliminado });
    } catch (error) {
      return res.status(400).json({ mensaje: error.message });
    }
  }
}

export const serviciosController = new ServiciosController();