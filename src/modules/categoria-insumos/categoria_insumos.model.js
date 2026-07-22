import { Model, DataTypes } from "sequelize"
import { sequelize } from "../../database.js";


export class CategoriaProducto extends Model { }

CategoriaProducto.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "https://i.postimg.cc/Tw9dbMG1/Mediamodifier-Design-Template.png"
    }
}, {
    sequelize,
    modelName: "categorias_insumo",
    hooks: {
        beforeValidate: (category, options) => {
            if (category.avatar === null) {
                category.avatar = "https://i.postimg.cc/Tw9dbMG1/Mediamodifier-Design-Template.png";
            }
        },

    }
})

