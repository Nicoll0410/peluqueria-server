import { Model, DataTypes } from "sequelize"
import { sequelize } from "../../database.js";
import { Usuario } from "../usuarios/usuarios.model.js";
import { Rol } from "../roles/roles.model.js";
import { passwordUtils } from "../../utils/password.util.js";

export class Barbero extends Model { }

Barbero.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    avatar: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    cedula: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    telefono: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    fecha_nacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    fecha_de_contratacion: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    instagram: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    facebook: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    tiktok: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    usuarioID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: "barbero"
})

async function initializeAdmin() {
    try {
        await sequelize.authenticate();
        
        // Verificar si ya hay barberos
        const amount = await Barbero.count();
        if (amount > 0) {
            console.log("✅ Ya existen barberos, admin no necesario");
            return;
        }

        // Buscar el rol Administrador
        const adminRole = await Rol.findOne({ where: { nombre: "Administrador" } });
        
        if (!adminRole) {
            console.log("⚠️ No se encontró el rol Administrador en la BD");
            return;
        }

        // Verificar si el usuario admin ya existe
        let usuario = await Usuario.findOne({ 
            where: { email: "salondebelleza.albaquiceno@gmail.com" } 
        });

        if (!usuario) {
            // Crear usuario admin
            usuario = await Usuario.create({
                email: "salondebelleza.albaquiceno@gmail.com",
                password: await passwordUtils.encrypt("albaquiceno17"),
                estaVerificado: true,
                rolID: adminRole.id
            });
            console.log("✅ Usuario administrador creado");
        } else {
            console.log("✅ Usuario administrador ya existía");
        }

        // Verificar si el barbero admin ya existe
        const existingBarbero = await Barbero.findOne({ 
            where: { usuarioID: usuario.id } 
        });

        if (existingBarbero) {
            console.log("✅ Barbero administrador ya existe");
            return;
        }

        // Crear barbero administrador
        await Barbero.create({
            nombre: "Administrador",
            avatar: null,
            cedula: "100000000",
            telefono: "100000000",
            fecha_nacimiento: "2006-08-08",
            fecha_de_contratacion: "2006-08-08",
            usuarioID: usuario.id
        });

        console.log("🎉 ADMINISTRADOR CREADO EXITOSAMENTE");

    } catch (error) {
        console.log("⚠️ Error en initializeAdmin (no crítico):", error.message);
    }
}

// Ejecutar después de que todo esté listo
setTimeout(() => {
    initializeAdmin().then(() => {
        console.log("✅ Inicialización de admin completada");
    }).catch(err => {
        console.log("⚠️ Error final:", err.message);
    });
}, 3000);