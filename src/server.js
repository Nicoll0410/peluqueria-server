// Archivo: src/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { task, recordatorioTask } from './modules/citas/citas.model.js';

import { jwtMiddlewares } from "./middlewares/jwt.middleware.js";
import { proveedoresRouter } from "./modules/proveedores/proveedores.route.js";
import { RouterVentas } from "./modules/ventas/ventas.route.js";
import { rolesRouter } from "./modules/roles/roles.route.js";
import { citasRouter } from "./modules/citas/citas.route.js";
import { insumosRouter } from "./modules/insumos/insumos.route.js";
import { barberosRouter } from "./modules/barberos/barberos.route.js";
import { serviciosRouter } from "./modules/servicios/servicios.route.js";
import { clientesRouter } from "./modules/clientes/clientes.route.js";
import { comprasRouter } from "./modules/compras/compras.route.js";
import { usuarioRouter } from "./modules/usuarios/usuarios.route.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { categoriasInsumosRouter } from "./modules/categoria-insumos/categoria_insumos.route.js";
import { movimientosRouter } from "./modules/movimientos/movimientos.route.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.route.js";
import { publicRouter } from "./modules/public/public.route.js";
import { Database } from "./database.js";
import { syncAllModels } from "./syncAll.js";
import { notificationsRouter } from "./modules/notifications/notifications.route.js";
import { JobsManager } from "./jobs/index.js";
import { galeriaRouter } from "./modules/galeria/galeria.route.js";

export class Server {
  constructor() {
    this.app = express();

    // Middlewares y rutas
    this.middlewares();
    this.routes();

    // 👇 Crear servidor HTTP y Socket.IO
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: [
          "https://sala-belleza-alba.vercel.app",
          "http://localhost:3000",
          "http://localhost:8081",
          "http://localhost:19006",
          "http://localhost:19000"
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      },
      transports: ['websocket', 'polling']
    });

    this.app.set("io", this.io);

    this.io.on("connection", (socket) => {
      console.log("🟢 Cliente conectado:", socket.id);

      socket.onAny((event, ...args) => {
        console.log(`📦 Socket Event: ${event}`, args);
      });

      socket.on("unir_usuario", (usuarioId) => {
        socket.join(`usuario_${usuarioId}`);
        socket.emit("usuario_unido", { 
          success: true, 
          usuarioId,
          room: `usuario_${usuarioId}`
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("🔴 Cliente desconectado:", socket.id, "Razón:", reason);
      });
    });

    // ⭐ INICIAR EL SERVIDOR INMEDIATAMENTE (sin esperar sync)
    const PORT = process.env.PORT || 10000;
    this.server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
    });

    // ⭐ Sincronizar modelos DESPUÉS de que el servidor ya está escuchando
    this.iniciarSincronizacion();
  }

  async iniciarSincronizacion() {
    try {
      console.log('🔄 Sincronizando modelos...');
      await syncAllModels();
      console.log('✅ Modelos sincronizados');

      // Iniciar jobs
      JobsManager.iniciarTodos();
      task.start();
      recordatorioTask.start();
      console.log('✅ Jobs de citas iniciados');

      // Configurar timeouts
      this.server.timeout = 300000;
      this.server.keepAliveTimeout = 120000;

      console.log('📧 Sistema de recordatorios activo');
    } catch (err) {
      console.error("❌ Error al sincronizar modelos:", err.message);
      // El servidor sigue corriendo aunque falle la sincronización
    }
  }

  middlewares() {
    const allowedOrigins = [
      "https://sala-belleza-alba.vercel.app",
      "http://localhost:3000",
      "http://localhost:8084",
      "http://localhost:19006",
    ];

    this.app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
          } else {
            console.log("❌ Origen no permitido por CORS:", origin);
            return callback(new Error("Not allowed by CORS"), false);
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-auth-token", "X-Requested-With"],
      })
    );

    this.app.options("*", cors());

    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(morgan("combined"));

    new Database();
  }

  routes() {
    // ⭐ HEALTH CHECK - LO MÁS IMPORTANTE PARA RENDER
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'Salón Alba Quiceno API', timestamp: new Date().toISOString() });
    });

    this.app.get('/ping', (req, res) => {
      res.send('pong');
    });

    this.app.get('/', (req, res) => {
      res.json({ message: 'Sala Alba Quiceno API funcionando', version: '1.0' });
    });

    // Rutas públicas
    this.app.use("/auth", authRouter);
    this.app.use("/public", publicRouter);
    this.app.use("/usuarios", usuarioRouter);
    this.app.use("/galeria", galeriaRouter);

    // Middleware JWT
    this.app.use(jwtMiddlewares.verifyToken);

    // Rutas privadas
    this.app.use("/roles", rolesRouter);
    this.app.use("/proveedores", proveedoresRouter);
    this.app.use("/categorias-insumos", categoriasInsumosRouter);
    this.app.use("/insumos", insumosRouter);
    this.app.use("/movimientos", movimientosRouter);
    this.app.use("/servicios", serviciosRouter);
    this.app.use("/notifications", notificationsRouter);
    this.app.use("/barberos", barberosRouter);
    this.app.use("/clientes", clientesRouter);
    this.app.use("/compras", comprasRouter);
    this.app.use("/dashboard", dashboardRouter);
    this.app.use("/citas", citasRouter);
    this.app.use("/ventas", RouterVentas);

    // 404
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
    });
  }
}

// ⭐ INICIAR EL SERVIDOR
const server = new Server();