import { type SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

/**
 * Конфигурация сессий Express
 */
const sessionConfig: SessionOptions = {
  // Секретный ключ для подписи сессионного cookie
  secret: process.env.SESSION_SECRET || 'your_session_secret_here',
  // Отключение повторного сохранения неизменённой сессии
  resave: false,
  // Отключение сохранения неинициализированной сессии
  saveUninitialized: false,
  // Хранилище сессий в MongoDB
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/delivery-service',
    collectionName: 'sessions',
  }),
  // Параметры cookie
  cookie: {
    // Флаг безопасного соединения (HTTPS)
    secure: process.env.USE_HTTPS === 'true',
    // Защита от XSS-атак
    httpOnly: true,
    // Время жизни сессии (24 часа)
    maxAge: 24 * 60 * 60 * 1000,
  },
};

export default sessionConfig;
