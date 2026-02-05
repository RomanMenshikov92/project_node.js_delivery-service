import Advertisement, { type IAdvertisement } from '../models/advertisement.model.js';

// Интерфейс параметров поиска объявлений
interface FindParams {
  shortText?: string;
  description?: string;
  userId?: string;
  tags?: string[];
}

// Интерфейс входных данных для создания объявления
interface CreateAdvertisementInput {
  shortText: string;
  description?: string | undefined;
  images?: string[] | undefined;
  userId: string;
  tags?: string[] | undefined;
}

/**
 * Модуль работы с объявлениями
 */
export class AdvertisementModule {
  /**
   * Поиск объявлений с фильтрацией
   * @param {FindParams} params - Параметры фильтрации
   * @returns {Promise<IAdvertisement[]>} - Возврат списка активных объявлений
   */
  static async find(params: FindParams): Promise<IAdvertisement[]> {
    // Игнорирование удалённых записей
    const query: any = { isDeleted: false };

    // Фильтрация по заголовку (регистронезависимый поиск)
    if (params.shortText) {
      query.shortText = { $regex: params.shortText, $options: 'i' };
    }
    // Фильтрация по описанию (регистронезависимый поиск)
    if (params.description) {
      query.description = { $regex: params.description, $options: 'i' };
    }
    // Фильтрация по ID автора (точное совпадение)
    if (params.userId) {
      query.userId = params.userId;
    }
    // Фильтрация по тегам (должны присутствовать все указанные теги)
    if (params.tags && params.tags.length > 0) {
      query.tags = { $all: params.tags };
    }

    // Выполнение запроса с заполнением данных пользователя
    return await Advertisement.find(query).populate('userId', 'name').exec();
  }

  /**
   * Создание нового объявления
   * @param {CreateAdvertisementInput} data - Данные для создания
   * @returns {Promise<IAdvertisement>} Возврат созданного объявления
   */
  static async create(data: CreateAdvertisementInput): Promise<IAdvertisement> {
    const advertisement = new Advertisement({
      ...data,
      isDeleted: false,
    });

    // Сохранение объявления в базе данных
    return await advertisement.save();
  }

  /**
   * Логическое удаление объявления (soft delete)
   * @param {string} id - ID объявления
   * @returns {Promise<IAdvertisement | null>} Возврат обновлённого объявления или возврат null
   */
  static async remove(id: string): Promise<IAdvertisement | null> {
    return await Advertisement.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

export default AdvertisementModule;
