import { IUser } from '../../models/user.model.js';

// Расширение типа пользователя Express
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}