import { Galeria } from './galeria.model.js';
import { Barbero } from '../barberos/barberos.model.js';
import { Usuario } from '../usuarios/usuarios.model.js';

export const galeriaController = {

  // ✅ NUEVO: Subir imagen con Cloudinary
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          mensaje: 'No se recibió ningún archivo'
        });
      }

      const {
        barberoID,
        descripcion,
        destacado,
        orden
      } = req.body;

      // Validar que el barbero existe
      const barbero = await Barbero.findByPk(barberoID);
      if (!barbero) {
        return res.status(404).json({
          success: false,
          mensaje: 'Barbero no encontrado'
        });
      }

      // La URL de Cloudinary viene en req.file.path
      const contenido = req.file.path;

      // Crear el registro en la BD
      const nuevoContenido = await Galeria.create({
        barberoID,
        tipo: 'imagen',
        contenido, // URL de Cloudinary
        descripcion: descripcion || null,
        destacado: destacado === 'true' || destacado === true,
        orden: parseInt(orden) || 0
      });

      // Obtener con relaciones
      const contenidoCreado = await Galeria.findByPk(nuevoContenido.id, {
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ]
        }]
      });

      res.status(201).json({
        success: true,
        mensaje: 'Imagen subida exitosamente',
        data: contenidoCreado
      });
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al subir la imagen',
        error: error.message
      });
    }
  },

  // ✅ NUEVO: Subir video con Cloudinary
  async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          mensaje: 'No se recibió ningún archivo'
        });
      }

      const {
        barberoID,
        descripcion,
        destacado,
        orden
      } = req.body;

      // Validar que el barbero existe
      const barbero = await Barbero.findByPk(barberoID);
      if (!barbero) {
        return res.status(404).json({
          success: false,
          mensaje: 'Barbero no encontrado'
        });
      }

      // La URL de Cloudinary viene en req.file.path
      const contenido = req.file.path;

      // Crear el registro en la BD
      const nuevoContenido = await Galeria.create({
        barberoID,
        tipo: 'video',
        contenido, // URL de Cloudinary
        descripcion: descripcion || null,
        destacado: destacado === 'true' || destacado === true,
        orden: parseInt(orden) || 0
      });

      // Obtener con relaciones
      const contenidoCreado = await Galeria.findByPk(nuevoContenido.id, {
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ]
        }]
      });

      res.status(201).json({
        success: true,
        mensaje: 'Video subido exitosamente',
        data: contenidoCreado
      });
    } catch (error) {
      console.error('❌ Error subiendo video:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al subir el video',
        error: error.message
      });
    }
  },

  // Obtener toda la galería (para clientes)
  async getAll(req, res) {
    try {
      const galeria = await Galeria.findAll({
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ],
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['email']
          }]
        }],
        order: [
          ['destacado', 'DESC'],
          ['orden', 'ASC'],
          ['createdAt', 'DESC']
        ]
      });

      // Agrupar por barbero
      const galeriaPorBarbero = galeria.reduce((acc, item) => {
        const barberoId = item.barberoID;
        
        if (!acc[barberoId]) {
          acc[barberoId] = {
            barbero: item.barbero,
            contenidos: []
          };
        }
        
        acc[barberoId].contenidos.push({
          id: item.id,
          tipo: item.tipo,
          contenido: item.contenido,
          descripcion: item.descripcion,
          instagram: item.instagram,
          facebook: item.facebook,
          tiktok: item.tiktok,
          destacado: item.destacado,
          orden: item.orden,
          createdAt: item.createdAt
        });
        
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: Object.values(galeriaPorBarbero)
      });
    } catch (error) {
      console.error('Error obteniendo galería:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener la galería'
      });
    }
  },

  // Obtener galería de un barbero específico
  async getByBarbero(req, res) {
    try {
      const { barberoId } = req.params;

      const galeria = await Galeria.findAll({
        where: { barberoID: barberoId },
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ],
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['email']
          }]
        }],
        order: [
          ['destacado', 'DESC'],
          ['orden', 'ASC'],
          ['createdAt', 'DESC']
        ]
      });

      res.status(200).json({
        success: true,
        data: galeria
      });
    } catch (error) {
      console.error('Error obteniendo galería del barbero:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener la galería del barbero'
      });
    }
  },

  // Obtener solo contenido destacado
// Obtener contenido para clientes
async getDestacados(req, res) {
    try {
      // ✅ Obtener TODOS los contenidos, no solo destacados
      const todos = await Galeria.findAll({
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ],
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['email']
          }]
        }],
        order: [
          ['destacado', 'DESC'],  // Primero destacados
          ['createdAt', 'DESC']   // Luego más recientes
        ]
      });

      // Agrupar por barbero (tomar el primero de cada uno)
      const porBarbero = todos.reduce((acc, item) => {
        const barberoId = item.barberoID;
        
        if (!acc[barberoId]) {
          acc[barberoId] = {
            barbero: item.barbero,
            contenidoDestacado: null
          };
        }
        
        // Solo tomar el primer contenido de cada barbero (será el destacado o el más reciente)
        if (!acc[barberoId].contenidoDestacado) {
          acc[barberoId].contenidoDestacado = {
            id: item.id,
            tipo: item.tipo,
            contenido: item.contenido,
            descripcion: item.descripcion,
            instagram: item.instagram,
            facebook: item.facebook,
            tiktok: item.tiktok
          };
        }
        
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: Object.values(porBarbero)
      });
    } catch (error) {
      console.error('Error obteniendo galería:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener contenido'
      });
    }
  },

  // Crear nuevo contenido en galería (método legacy - ya no se usa)
  async create(req, res) {
    try {
      const {
        barberoID,
        tipo,
        contenido,
        descripcion,
        instagram,
        facebook,
        tiktok,
        destacado,
        orden
      } = req.body;

      // Validar que el barbero existe
      const barbero = await Barbero.findByPk(barberoID);
      if (!barbero) {
        return res.status(404).json({
          success: false,
          mensaje: 'Barbero no encontrado'
        });
      }

      // Validar tipo
      if (!['imagen', 'video'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          mensaje: 'Tipo de contenido inválido. Debe ser "imagen" o "video"'
        });
      }

      // Crear el contenido
      const nuevoContenido = await Galeria.create({
        barberoID,
        tipo,
        contenido,
        descripcion: descripcion || null,
        instagram: instagram || null,
        facebook: facebook || null,
        tiktok: tiktok || null,
        destacado: destacado || false,
        orden: orden || 0
      });

      // Obtener el contenido creado con sus relaciones
      const contenidoCreado = await Galeria.findByPk(nuevoContenido.id, {
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ]
        }]
      });

      res.status(201).json({
        success: true,
        mensaje: 'Contenido agregado exitosamente',
        data: contenidoCreado
      });
    } catch (error) {
      console.error('Error creando contenido:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al crear el contenido'
      });
    }
  },

  // Actualizar contenido
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        descripcion,
        instagram,
        facebook,
        tiktok,
        destacado,
        orden
      } = req.body;

      const contenido = await Galeria.findByPk(id);
      
      if (!contenido) {
        return res.status(404).json({
          success: false,
          mensaje: 'Contenido no encontrado'
        });
      }

      // Actualizar
      await contenido.update({
        descripcion: descripcion !== undefined ? descripcion : contenido.descripcion,
        instagram: instagram !== undefined ? instagram : contenido.instagram,
        facebook: facebook !== undefined ? facebook : contenido.facebook,
        tiktok: tiktok !== undefined ? tiktok : contenido.tiktok,
        destacado: destacado !== undefined ? destacado : contenido.destacado,
        orden: orden !== undefined ? orden : contenido.orden
      });

      // Obtener actualizado con relaciones
      const actualizado = await Galeria.findByPk(id, {
        include: [{
          model: Barbero,
          as: 'barbero',
          attributes: [
            'id', 
            'nombre', 
            'telefono', 
            'avatar',
            'instagram',
            'facebook',
            'tiktok'
          ]
        }]
      });

      res.status(200).json({
        success: true,
        mensaje: 'Contenido actualizado exitosamente',
        data: actualizado
      });
    } catch (error) {
      console.error('Error actualizando contenido:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al actualizar el contenido'
      });
    }
  },

  // Eliminar contenido
  async delete(req, res) {
    try {
      const { id } = req.params;

      const contenido = await Galeria.findByPk(id);
      
      if (!contenido) {
        return res.status(404).json({
          success: false,
          mensaje: 'Contenido no encontrado'
        });
      }

      await contenido.destroy();

      res.status(200).json({
        success: true,
        mensaje: 'Contenido eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando contenido:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al eliminar el contenido'
      });
    }
  },

  // Marcar/desmarcar como destacado
// Marcar/desmarcar como destacado
async toggleDestacado(req, res) {
    try {
      const { id } = req.params;

      const contenido = await Galeria.findByPk(id);
      
      if (!contenido) {
        return res.status(404).json({
          success: false,
          mensaje: 'Contenido no encontrado'
        });
      }

      // ✅ Guardar el nuevo estado antes de actualizar
      const nuevoEstado = !contenido.destacado;
      
      await contenido.update({
        destacado: nuevoEstado
      });

      // ✅ Recargar el modelo para obtener los valores actualizados
      await contenido.reload();

      res.status(200).json({
        success: true,
        mensaje: `Contenido ${nuevoEstado ? 'marcado' : 'desmarcado'} como destacado`,
        data: contenido
      });
    } catch (error) {
      console.error('Error cambiando estado destacado:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al cambiar estado destacado'
      });
    }
  }
};