import { Account } from './Account';
import { PasswordReset } from './PasswordReset';
import { User } from './User';

User.hasMany(Account, { foreignKey: 'userId', onDelete: 'CASCADE' });
Account.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PasswordReset, { foreignKey: 'userId', onDelete: 'CASCADE' });
PasswordReset.belongsTo(User, { foreignKey: 'userId' });

export { User, Account, PasswordReset };
