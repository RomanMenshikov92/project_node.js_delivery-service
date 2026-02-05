import { Router } from 'express';
import {
  getAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  deleteAdvertisement,
} from '../controllers/advertisement.controller.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { ensureAuthenticated } from '../middleware/auth.middleware.js';

// Загрузка переменных окружения
dotenv.config();

// Инициализация роутера Express
const router: Router = Router();

// Настройка Multer для загрузки изображений
const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
// Создание директории для загрузок
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Конфигурация хранилища файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Определение пути загрузки по ID пользователя
    const userId = (req.user as any)?._id || 'temp';
    const userUploadPath = path.join(uploadPath, userId.toString());
    // Создание пользовательской директории
    if (!fs.existsSync(userUploadPath)) {
      fs.mkdirSync(userUploadPath, { recursive: true });
    }
    cb(null, userUploadPath);
  },
  filename: (req, file, cb) => {
    // Генерация уникального имени файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Фильтрация загружаемых файлов
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Разрешение только изображений
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла'));
  }
};

// Инициализация middleware Multer
const upload = multer({ storage, fileFilter });

// Регистрация публичных маршрутов
router.get('/', getAdvertisements);
router.get('/:id', getAdvertisementById);

// Регистрация приватных маршрутов
router.post('/', ensureAuthenticated, upload.array('images', 5), createAdvertisement);
router.delete('/:id', ensureAuthenticated, deleteAdvertisement);

export default router;
