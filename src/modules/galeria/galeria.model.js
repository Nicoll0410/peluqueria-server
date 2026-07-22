import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../database.js";

export class Galeria extends Model {}

Galeria.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  barberoID: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'barberos',
      key: 'id'
    }
  },
  tipo: {
    type: DataTypes.ENUM('imagen', 'video'),
    allowNull: false,
    defaultValue: 'imagen'
  },
  contenido: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Base64 de la imagen o URL del video'
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  instagram: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  facebook: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  tiktok: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  destacado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si es verdadero, aparecerá en la vista principal'
  },
  orden: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Para ordenar los elementos en la galería'
  }
}, {
  sequelize,
  modelName: "galeria",
  tableName: "galeria",
  timestamps: true
});