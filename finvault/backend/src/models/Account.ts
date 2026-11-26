import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import { decrypt, encrypt } from '../utils/crypto';
import { User } from './User';

/**
 * Cuenta bancaria del usuario. IBAN, saldo y notas se guardan CIFRADOS con
 * AES-256-GCM. Los getters/setters virtuales hacen el cifrado transparente:
 * el resto de la aplicación trabaja con valores en claro sin tocar el cifrado.
 */
export class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare alias: string;

  declare ibanEncrypted: CreationOptional<string>;
  declare balanceEncrypted: CreationOptional<string>;
  declare notesEncrypted: CreationOptional<string | null>;

  /** Virtuales transparentes (cifrado/descifrado). */
  declare iban: string;
  declare balance: string;
  declare notes: CreationOptional<string | null>;

  declare maskedIban: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Respuesta segura: nunca incluye IBAN completo ni notas descifradas. */
  toSafeJSON(): {
    id: string;
    alias: string;
    maskedIban: string;
    balance: string;
    hasNotes: boolean;
    createdAt: Date;
  } {
    return {
      id: this.id,
      alias: this.alias,
      maskedIban: this.maskedIban,
      balance: this.balance,
      hasNotes: Boolean(this.notesEncrypted),
      createdAt: this.createdAt,
    };
  }
}

Account.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    alias: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    ibanEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    balanceEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notesEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    iban: {
      type: DataTypes.VIRTUAL,
      get(this: Account): string {
        const encrypted = this.getDataValue('ibanEncrypted');
        return encrypted ? decrypt(encrypted) : '';
      },
      set(this: Account, value: string) {
        this.setDataValue('ibanEncrypted', encrypt(value));
      },
    },
    balance: {
      type: DataTypes.VIRTUAL,
      get(this: Account): string {
        const encrypted = this.getDataValue('balanceEncrypted');
        return encrypted ? decrypt(encrypted) : '0.00';
      },
      set(this: Account, value: string) {
        // Se guarda como texto decimal (sin coma flotante) y luego se cifra.
        this.setDataValue('balanceEncrypted', encrypt(value));
      },
    },
    notes: {
      type: DataTypes.VIRTUAL,
      get(this: Account): string | null {
        const encrypted = this.getDataValue('notesEncrypted');
        return encrypted ? decrypt(encrypted) : null;
      },
      set(this: Account, value: string | null) {
        this.setDataValue('notesEncrypted', value ? encrypt(value) : null);
      },
    },
    maskedIban: {
      type: DataTypes.VIRTUAL,
      get(this: Account): string {
        const encrypted = this.getDataValue('ibanEncrypted');
        if (!encrypted) return '';
        const iban = decrypt(encrypted);
        return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`;
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Account',
    tableName: 'accounts',
    indexes: [{ fields: ['userId'] }],
  },
);
