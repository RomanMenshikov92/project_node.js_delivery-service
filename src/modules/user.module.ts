import User, { type IUser } from '../models/user.model.js';
import bcrypt from 'bcryptjs';

// Интерфейс входных данных для создания пользователя
interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  contactPhone?: string;
}

// Тип для возвращаемого значения (без passwordHash)
export type UserWithoutPassword = Omit<IUser, 'passwordHash'>;

/**
 * Модуль управления пользователями
 */
export class UserModule {
  /**
   * Создание нового пользователя
   * @param {CreateUserInput} data - Данные для регистрации
   * @returns {Promise<UserWithoutPassword>} - Возврат пользователя без хеша пароля
   */
  static async create(data: CreateUserInput): Promise<UserWithoutPassword> {
    // Извлечение данных пользователя
    const { email, password, name, contactPhone } = data;

    // Хеширование пароля перед сохранением
    const passwordHash = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = new User({
      email,
      passwordHash,
      name,
      contactPhone,
    });

    // Сохранение пользователя в базе данных
    await user.save();

    // Формирование безопасного объекта без пароля
    const { _id, email: userEmail, name: userName, contactPhone: userPhone } = user.toObject();
    // Приведение к типу без пароля
    return {
      id: _id,
      email: userEmail,
      name: userName,
      contactPhone: userPhone,
    } as UserWithoutPassword;
  }

  /**
   * Поиск пользователя по email
   * @param {string} email - Email пользователя
   * @returns {Promise<UserWithoutPassword | null>} - Возврат пользователя без хеша пароля или null
   */
  static async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    // Поиск пользователя в базе данных
    const user = await User.findOne({ email });
    // Проверка существования пользователя
    if (!user) return null;

    // Формирование безопасного объекта без пароля
    const { passwordHash: _, ...userSafe } = user.toObject();
    // Приведение к типу без пароля
    return userSafe as unknown as UserWithoutPassword;
  }

  /**
   * Поиск пользователя с хешем пароля (для аутентификации)
   * @param {string} email - Email пользователя
   * @returns {Promise<IUser | null>} - Возврат полного объекта пользователя или null
   */
  static async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }
}

export default UserModule;
