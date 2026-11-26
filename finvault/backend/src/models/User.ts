import bcrypt from 'bcrypt';
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import { decrypt, encrypt, maskPhone } from '../utils/crypto';

/** Coste de bcrypt. Mínimo aceptado por la política: 12. */
export const BCRYPT_COST = 12;

export type UserRole = 'user' | 'admin';
export type AuthProvider = 'local' | 'google';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare provider: CreationOptional<AuthProvider>;
  declare role: CreationOptional<UserRole>;
  declare googleId: CreationOptional<string | null>;
  declare passwordHash: CreationOptional<string | null>;
  declare phoneEncrypted: CreationOptional<string | null>;
  /** Virtual de escritura: se hashea con bcrypt en el hook beforeSave y se descarta. */
  declare password: CreationOptional<string | null>;
  /** Virtual de escritura: se cifra con AES-256-GCM antes de persistir. */
  declare phone: CreationOptional<string | null>;
  /** Virtual de solo lectura: único modo en que el teléfono sale del modelo. */
  declare maskedPhone: CreationOptional<string | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Comparación en tiempo constante vía bcrypt. Nunca se descifra ni se compara en claro. */
  async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /** Evita que passwordHash, googleId o el teléfono cifrado salgan en respuestas JSON. */
  toSafeJSON(): {
    id: string;
    email: string;
    role: UserRole;
    provider: AuthProvider;
    maskedPhone: string | null;
    createdAt: Date;
  } {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      provider: this.provider,
      maskedPhone: this.maskedPhone,
      createdAt: this.createdAt,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      set(value: string) {
        this.setDataValue('email', value.trim().toLowerCase());
      },
    },
    provider: {
      type: DataTypes.ENUM('local', 'google'),
      allowNull: false,
      defaultValue: 'local',
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phoneEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    password: {
      type: DataTypes.VIRTUAL,
      allowNull: true,
    },
    phone: {
      type: DataTypes.VIRTUAL,
      allowNull: true,
      set(this: User, value: string | null) {
        this.setDataValue('phoneEncrypted', value ? encrypt(value) : null);
      },
    },
    maskedPhone: {
      type: DataTypes.VIRTUAL,
      get(this: User): string | null {
        const encrypted = this.getDataValue('phoneEncrypted');
        if (!encrypted) return null;
        return maskPhone(decrypt(encrypted));
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeSave: async (user: User) => {
        // Solo se hashea cuando llega una contraseña en claro en esta operación.
        if (user.password) {
          user.passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
          user.password = null;
        }
      },
    },
  },
);
