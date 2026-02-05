import type { Application } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import UserModule from '../modules/user.module.js';
import User, { type IUser } from '../models/user.model.js';
import bcrypt from 'bcryptjs';

// Тип пользователя Passport
type PassportUser = IUser;

// Тип callback верификации
type VerifyDoneCallback = (
  _error: Error | null,
  _user?: PassportUser | false,
  _info?: { message: string } | any,
) => void;

// Тип callback сериализации
type SerializeDoneCallback = (
  _error: Error | null,
  id?: string | import('mongoose').Types.ObjectId,
) => void;

// Тип callback десериализации
type DeserializeDoneCallback = (_error: Error | null, user?: PassportUser | null) => void;

/**
 * Инициализация Passport.js
 * @param {Application} app - Express приложение
 * @returns {void}
 */
const initializePassport = (app: Application): void => {
  // Стратегия локальной аутентификации (email + пароль)
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email: string, password: string, done: VerifyDoneCallback) => {
        try {
          // Поиск пользователя по email с хешем пароля
          const user: PassportUser | null = await UserModule.findByEmailWithPassword(email);
          if (!user) {
            return done(null, false, { message: 'Неверный email или пароль' });
          }

          // Сравнение паролей
          const isPasswordValid: boolean = await bcrypt.compare(password, user.passwordHash);
          if (!isPasswordValid) {
            return done(null, false, { message: 'Неверный email или пароль' });
          }

          // Возврат аутентифицированного пользователя
          return done(null, user);
        } catch (error: unknown) {
          // Обработка ошибки верификации
          if (error instanceof Error) {
            return done(error, false);
          } else {
            const errorMessage = typeof error === 'string' ? error : 'An unknown error occurred';
            return done(new Error(errorMessage), false);
          }
        }
      },
    ),
  );

  // Сериализация пользователя в сессию
  passport.serializeUser((user: unknown, done: SerializeDoneCallback) => {
    // Извлечение идентификатора пользователя для сохранения в сессии
    if (typeof user === 'object' && user !== null && 'id' in user) {
      done(null, user.id as string);
    } else {
      done(new Error('Invalid user object'), undefined);
    }
  });

  // Десериализация пользователя из сессии
  passport.deserializeUser(async (id: string, done: DeserializeDoneCallback) => {
    try {
      // Поиск пользователя по ID
      const user: PassportUser | null = await User.findById(id);
      done(null, user);
    } catch (error: unknown) {
      // Обработка ошибки десериализации
      if (error instanceof Error) {
        done(error, null);
      } else {
        const errorMessage =
          typeof error === 'string' ? error : 'An unknown error occurred during deserialize';
        done(new Error(errorMessage), null);
      }
    }
  });

  // Подключение middleware Passport
  app.use(passport.initialize());
  app.use(passport.session());
};

export default initializePassport;
