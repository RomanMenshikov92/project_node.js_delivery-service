import express, { type Application, type ErrorRequestHandler } from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';
import multer from 'multer';
import session from 'express-session';
import dotenv from 'dotenv';
import connectDB from './configs/database.config.js';
import sessionConfig from './configs/session.config.js';
import { setupSocketHandlers } from './configs/socket.config.js';
import initializePassport from './configs/passport.config.js';
import authRoutes from './routes/auth.route.js';
import advertisementRoutes from './routes/advertisement.route.js';
import passport from 'passport';

// Загрузка переменных окружения
dotenv.config();

// Инициализация Express-приложения
const app: Application = express();
// Создание HTTP-сервера
const server = http.createServer(app);

// Подключение к MongoDB
connectDB();

// Middleware для парсинга JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
const sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);

// Инициализация Passport
initializePassport(app);
app.use(passport.initialize());
app.use(passport.session());

// Сервинг статических файлов
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Регистрация маршрутов API
app.use('/api', authRoutes);
app.use('/api/advertisements', advertisementRoutes);

// Обработка ошибок Multer
const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Слишком много файлов', status: 'error' });
    }
  }
  if (error.message === 'Недопустимый тип файла') {
    return res.status(400).json({ error: error.message, status: 'error' });
  }
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
};
app.use(errorHandler);

// Конфигурация портов и хоста
const DEV_PORT: number = parseInt(process.env.DEV_PORT || '3000', 10);
const PROD_PORT: number = parseInt(process.env.PROD_PORT || '9999', 10);
const HOST = process.env.HTTP_HOST || 'localhost';
const actualPort: number = process.env.NODE_ENV === 'production' ? PROD_PORT : DEV_PORT;

// Сообщение для корневого маршрута
const serverMessage =
  process.env.NODE_ENV === 'production' ? 'Hello from server.js!' : 'Hello from app.ts!';

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ message: serverMessage, env: process.env.NODE_ENV || 'development' });
});

// Настройка Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Интеграция сессий Express с Socket.IO
io.use((socket: any, next) => {
  socket.request.res = socket.request.res || {};
  sessionMiddleware(socket.request, socket.request.res, (err: any) => {
    if (err) return next(err);

    // Инициализация паспорта для сокета
    passport.initialize()(socket.request, socket.request.res, () => {
      passport.session()(socket.request, socket.request.res, next);
    });
  });
});

// Подключение обработчиков Socket.IO
setupSocketHandlers(io);

// Запуск сервера
server.listen(actualPort, HOST, () => {
  console.log(
    `Server running at http://${HOST}:${actualPort} in ${process.env.NODE_ENV || 'development'} mode`,
  );
});

export default app;
