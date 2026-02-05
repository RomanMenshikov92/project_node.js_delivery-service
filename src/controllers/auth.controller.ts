import type { Request, Response } from 'express';
import UserModule, { type UserWithoutPassword } from '../modules/user.module.js';

/**
 * Регистрация нового пользователя
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    // Извлечение данных регистрации из тела запроса
    const { email, password, name, contactPhone } = req.body;

    // Проверка уникальности email
    const existingUser: UserWithoutPassword | null = await UserModule.findByEmail(email);

    // Валидация занятости email
    if (existingUser) {
      res.status(400).json({ error: 'email занят', status: 'error' });
      return;
    }

    // Создание пользователя с хешированием пароля
    const user: UserWithoutPassword = await UserModule.create({ email, password, name, contactPhone });

    // Подготовка данных для ответа
    const userData = user;

    // Отправка успешного ответа с данными пользователя
    res.status(200).json({ data: userData, status: 'ok' });
  } catch (error: unknown) {
    // Обработка ошибки регистрации
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};

/**
 * Аутентификация пользователя
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Извлечение учётных данных из тела запроса
    const { email, password } = req.body;

    // Поиск пользователя с хешем пароля
    const user = await UserModule.findByEmailWithPassword(email);
    // Проверка существования пользователя
    if (!user) {
      res.status(400).json({ error: 'Неверный логин или пароль', status: 'error' });
      return;
    }

    // Сравнение паролей
    const isPasswordValid = await user.comparePassword(password);
    // Валидация корректности пароля
    if (!isPasswordValid) {
      res.status(400).json({ error: 'Неверный логин или пароль', status: 'error' });
      return;
    }

    // Авторизация через Passport
    req.login(user, (err) => {
      // Обработка ошибки входа
      if (err) {
        console.error('Passport login error:', err);
        res.status(500).json({ error: 'Ошибка аутентификации', status: 'error' });
        return;
      }

      // Формирование безопасного ответа (без passwordHash)
      const userData = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        contactPhone: user.contactPhone
      };

      // Отправка успешного ответа с данными пользователя
      res.status(200).json({ data: userData, status: 'ok' });
    });
  } catch (error) {
    // Обработка ошибки аутентификации
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};

/**
 * Выход из системы
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @returns {void}
 */
export const signout = (req: Request, res: Response): void => {
  // Завершение сессии
  req.logout((err) => {
    // Обработка ошибки выхода
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Ошибка при выходе', status: 'error' });
      return;
    }
    // Уничтожение сессии
    req.session.destroy((err) => {
      // Обработка ошибки уничтожения сессии
      if (err) {
        console.error('Session destroy error:', err);
        res.status(500).json({ error: 'Ошибка при выходе', status: 'error' });
        return;
      }
      // Отправка подтверждения успешного выхода
      res.status(200).json({ status: 'ok' });
    });
  });
};