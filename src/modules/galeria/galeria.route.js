import { Router } from 'express';
import { galeriaController } from './galeria.controller.js';
import { uploadImage, uploadVideo } from '../../../config/cloudinary.js';

export const galeriaRouter = Router();

/* ---------- Obtener toda la galería ---------- */
galeriaRouter.get('/', galeriaController.getAll);

/* ---------- Obtener solo destacados ---------- */
galeriaRouter.get('/destacados', galeriaController.getDestacados);

/* ---------- Obtener galería de un barbero ---------- */
galeriaRouter.get('/barbero/:barberoId', galeriaController.getByBarbero);

/* ---------- ✅ NUEVO: Subir IMAGEN con Cloudinary ---------- */
galeriaRouter.post('/upload/image', uploadImage.single('file'), galeriaController.uploadImage);

/* ---------- ✅ NUEVO: Subir VIDEO con Cloudinary ---------- */
galeriaRouter.post('/upload/video', uploadVideo.single('file'), galeriaController.uploadVideo);

/* ---------- Crear contenido (ya no se usa directamente) ---------- */
galeriaRouter.post('/', galeriaController.create);

/* ---------- Actualizar contenido ---------- */
galeriaRouter.put('/:id', galeriaController.update);

/* ---------- Eliminar contenido ---------- */
galeriaRouter.delete('/:id', galeriaController.delete);

/* ---------- Toggle destacado ---------- */
galeriaRouter.patch('/:id/destacado', galeriaController.toggleDestacado);