import type { Request, Response } from 'express';
import AdvertisementModule from '../modules/advertisement.module.js';
import Advertisement from '../models/advertisement.model.js';
import mongoose, { isValidObjectId } from 'mongoose';

// Тип параметров фильтрации из query-строки
interface QueryParams {
  shortText?: string;
  description?: string;
  userId?: string;
  tags?: string[];
}

// Интерфейс для объявления с populated пользователем
interface IAdvertisementWithUser {
  _id: mongoose.Types.ObjectId;
  shortText: string;
  description?: string;
  images?: string[];
  userId: {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  isDeleted: boolean;
}

/**
 * Получение списка объявлений
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const getAdvertisements = async (req: Request, res: Response): Promise<void> => {
  try {
    // Извлечение параметров фильтрации из query-строки
    const { shortText, description, userId, tags } = req.query as unknown as QueryParams;

    // Формирование объекта параметров для поиска
    const params: Partial<QueryParams> = {};
    if (shortText) params.shortText = shortText;
    if (description) params.description = description;
    if (userId) params.userId = userId;
    if (tags) params.tags = Array.isArray(tags) ? tags : [tags];

    // Выполнение поиска объявлений через модуль
    const advertisements = await AdvertisementModule.find(params);

    // Форматирование ответа
    const formattedAds = (advertisements as unknown as IAdvertisementWithUser[]).map(ad => ({
      id: ad._id.toString(),
      shortTitle: ad.shortText,
      description: ad.description,
      images: ad.images || [],
      user: {
        id: ad.userId._id.toString(),
        name: ad.userId.name,
      },
      createdAt: ad.createdAt,
      tags: ad.tags || [],
    }));

    // Отправка успешного ответа с данными
    res.status(200).json({ data: formattedAds, status: 'ok' });
  } catch (error) {
    // Обработка ошибки получения списка объявлений
    console.error('Get advertisements error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};

/**
 * Получение объявления по ID
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const getAdvertisementById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Извлечение ID объявления из URL-параметров
    const { id } = req.params;

    // Валидация формата ObjectId
    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Неверный формат ID объявления', status: 'error' });
      return;
    }

    // Валидация наличия ID
    if (!id) {
      res.status(400).json({ error: 'ID объявления отсутствует', status: 'error' });
      return;
    }

    // Поиск объявления с исключением удалённых
    const advertisement = await Advertisement.findOne({ _id: id, isDeleted: false })
      .populate('userId', 'name')
      .exec();

    // Проверка существования объявления
    if (!advertisement) {
      res.status(404).json({ error: 'Объявление не найдено', status: 'error' });
      return;
    }

    // Приведение к populated типу
    const ad = advertisement as unknown as IAdvertisementWithUser;
    const formattedAd = {
      id: ad._id.toString(),
      shortTitle: ad.shortText,
      description: ad.description,
      images: ad.images || [],
      user: {
        id: ad.userId._id.toString(),
        name: ad.userId.name,
      },
      createdAt: ad.createdAt,
      tags: ad.tags || [],
    };

    // Отправка успешного ответа с данными
    res.status(200).json({ data: formattedAd, status: 'ok' });
  } catch (error) {
    // Обработка ошибки получения объявления по ID
    console.error('Get advertisement by ID error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};

/**
 * Создание нового объявления
 * @param {Request} req - Аутентифицированный запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const createAdvertisement = async (req: Request, res: Response): Promise<void> => {
  try {
    // Проверка аутентификации пользователя
    if (!req.user) {
      res.status(401).json({ error: 'Необходима аутентификация', status: 'error' });
      return;
    }

    // Извлечение данных из тела запроса
    const { shortTitle, description, tags } = req.body;
    // Обработка загруженных файлов
    const files = (req.files || []) as Express.Multer.File[];
    // Извлечение ID авторизованного пользователя
    const userId = req.user._id;
    const userName = req.user.name;

    // Преобразование загруженных файлов в относительные пути
    const imagePaths = files.map(file => `/uploads/${userId}/${file.filename}`);

    // Нормализация тегов в массив
    const tagsArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;

    // Создание объявления через модуль
    const advertisement = await AdvertisementModule.create({
      shortText: shortTitle,
      description,
      images: imagePaths,
      userId: userId.toString(),
      tags: tagsArray,
    });

   // Получение объявления с данными пользователя
    const populatedAd = await Advertisement.findById(advertisement._id)
      .populate('userId', 'name')
      .exec();

    // Проверка успешности получения данных
    if (!populatedAd) {
      throw new Error('Failed to populate user after creation');
    }

    // Приведение типа
    const ad = populatedAd as unknown as IAdvertisementWithUser;
    // Форматирование ответа
    const formattedAd = {
      id: ad._id.toString(),
      shortTitle: ad.shortText,
      description: ad.description,
      images: ad.images || [],
      user: {
        id: ad.userId._id.toString(),
        name: ad.userId.name,
      },
      createdAt: ad.createdAt,
      tags: ad.tags || [],
    };

    // Отправка успешного ответа с данными
    res.status(200).json({ data: formattedAd, status: 'ok' });
  } catch (error) {
    // Обработка ошибки создания объявления
    console.error('Create advertisement error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};

/**
 * Удаление объявления (soft delete)
 * @param {Request} req - Аутентифицированный запрос Express
 * @param {Response} res - Ответ Express
 * @returns {Promise<void>}
 */
export const deleteAdvertisement = async (req: Request, res: Response): Promise<void> => {
  try {
    // Проверка аутентификации пользователя
    if (!req.user) {
      res.status(401).json({ error: 'Необходима аутентификация', status: 'error' });
      return;
    }

    // Извлечение ID объявления из URL-параметров
    const { id } = req.params;
    // Валидация наличия ID
    if (!id) {
      res.status(400).json({ error: 'ID объявления отсутствует', status: 'error' });
      return;
    }

    // Извлечение ID авторизованного пользователя
    const userId = req.user._id;

    // Поиск объявления по ID
    const advertisement = await Advertisement.findById(id);
    // Проверка существования объявления
    if (!advertisement) {
      res.status(404).json({ error: 'Объявление не найдено', status: 'error' });
      return;
    }

    // Проверка прав владельца объявления
    if (advertisement.userId.toString() !== userId.toString()) {
      res.status(403).json({ error: 'Недостаточно прав', status: 'error' });
      return;
    }

    // Логическое удаление через модуль
    await AdvertisementModule.remove(id);

    // Отправка подтверждения успешного удаления
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    // Обработка ошибки удаления объявления
    console.error('Delete advertisement error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', status: 'error' });
  }
};
