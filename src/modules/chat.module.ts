import Chat from '../models/chat.model.js';
import type { IChat } from '../models/chat.model.js';
import type { IMessage } from '../models/message.model.js';
import EventEmitter from 'events';
import mongoose from 'mongoose';

// Глобальный EventEmitter для оповещения о новых сообщениях
const chatEventEmitter = new EventEmitter();

/**
 * Модуль управления чатами
 */
export class ChatModule {
  /**
   * Подписка на новые сообщения
   * @param {Function} callback - Обработчик события нового сообщения
   * @param {Object} callback._data - Данные события
   * @param {string} callback._data.chatId - Идентификатор чата
   * @param {IMessage} callback._data.message - Объект сообщения
   * @param {string[]} callback._data.participants - ID участников чата
   * @returns {void}
   */
  static subscribe(
    callback: (_data: { chatId: string; message: IMessage; participants: string[] }) => void,
  ): void {
    chatEventEmitter.on('newMessage', callback);
  }

  /**
   * Отписка от новых сообщений
   * @param {Function} callback - Обработчик события нового сообщения
   * @param {Object} callback._data - Данные события
   * @param {string} callback._data.chatId - Идентификатор чата
   * @param {IMessage} callback._data.message - Объект сообщения
   * @param {string[]} callback._data.participants - ID участников чата
   * @returns {void}
   */
  static unsubscribe(
    callback: (_data: { chatId: string; message: IMessage; participants: string[] }) => void,
  ): void {
    chatEventEmitter.off('newMessage', callback);
  }

  /**
   * Поиск чата между двумя пользователями
   * @param {[string, string]} users - Массив ID двух пользователей
   * @returns {Promise<IChat | null>} Возврат найденного чата или возврат null
   */
  static async find(users: [string, string]): Promise<IChat | null> {
    // Деструктуризация ID пользователей
    const [user1, user2] = users;
    // Поиск чата в любом порядке участников
    const chat = await Chat.findOne({
      $or: [{ users: [user1, user2] }, { users: [user2, user1] }],
    })
      .populate('messages.author', 'name')
      .exec();

    return chat;
  }

  /**
   * Отправка сообщения в чат
   * @param {Object} data - Данные сообщения
   * @param {string} data.author - ID автора
   * @param {string} data.receiver - ID получателя
   * @param {string} data.text - Текст сообщения
   * @returns {Promise<IMessage>} - Возврат отправленного сообщения
   */
  static async sendMessage(data: {
    author: string;
    receiver: string;
    text: string;
  }): Promise<IMessage> {
    // Извлечение данных
    const { author, receiver, text } = data;

    // Поиск существующего чата
    let chat = await this.find([author, receiver] as [string, string]);

    if (!chat) {
      // Создания нового чата
      chat = new Chat({
        users: [author, receiver],
      });
    }

    // Создание объекта сообщения
    const newMessageData = {
      _id: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(author),
      sentAt: new Date(),
      text,
      readAt: undefined,
    };

    // Добавление сообщения в историю
    chat.messages.push(newMessageData);

    // Сохранение чата в базе данных
    await chat.save();

    // Получаем обновлённое сообщение из чата
    const savedMessage = chat.messages[chat.messages.length - 1];

    // Проверка существования сообщения
    if (!savedMessage) {
      throw new Error('Failed to save message');
    }

    // Получаем ID участников как строки
    const participants = chat.users.map(user => user.toString());

    // Оповещение подписчиков через EventEmitter
    chatEventEmitter.emit('newMessage', {
      chatId: chat._id.toString(),
      message: savedMessage,
      participants,
    });

    return savedMessage;
  }

  /**
   * Получение истории сообщений чата
   * @param {string} chatId - ID чата
   * @returns {Promise<IMessage[]>} - Возврат массива сообщений
   */
  static async getHistory(chatId: string): Promise<IMessage[]> {
    // Поиск чата по ID с заполнением данных авторов
    const chat = await Chat.findById(chatId).populate('messages.author', 'name').exec();
    if (!chat) {
      return [];
    }

    return chat.messages;
  }

  /**
   * Пометить сообщение как прочитанное КОНКРЕТНЫМ пользователем
   * @param {string} chatId - ID чата
   * @param {string} messageId - ID сообщения
   * @param {string} userId - ID пользователя, который прочитал
   * @returns {Promise<IMessage | null>}
   */
  static async markAsRead(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<IMessage | null> {
    const chat = await Chat.findById(chatId);

    if (!chat) return null;

    const isParticipant = chat.users.some(user => user.toString() === userId);
    if (!isParticipant) return null;

    const message = chat.messages.find(msg => msg._id.toString() === messageId);
    if (!message) return null;

    // Нельзя прочитать своё собственное сообщение
    if (message.author.toString() === userId) return null;

    // Инициализируем readStatus если не существует
    if (!message.readStatus) {
      message.readStatus = {};
    }

    // Помечаем сообщение как прочитанное ЭТИМ пользователем
    if (!message.readStatus[userId]) {
      message.readStatus[userId] = new Date();
      await chat.save();
    }

    return message;
  }

  /**
   * Пометить ВСЕ сообщения в чате как прочитанные КОНКРЕТНЫМ пользователем
   * @param {string} chatId - ID чата
   * @param {string} userId - ID пользователя
   * @returns {Promise<number>}
   */
  static async markAllAsRead(chatId: string, userId: string): Promise<number> {
    const chat = await Chat.findById(chatId);

    if (!chat) return 0;

    const isParticipant = chat.users.some(user => user.toString() === userId);
    if (!isParticipant) return 0;

    let readCount = 0;

    chat.messages.forEach(message => {
      // Пропускаем свои сообщения
      if (message.author.toString() === userId) return;

      // Инициализируем readStatus
      if (!message.readStatus) {
        message.readStatus = {};
      }

      // Помечаем как прочитанное ЭТИМ пользователем
      if (!message.readStatus[userId]) {
        message.readStatus[userId] = new Date();
        readCount++;
      }
    });

    if (readCount > 0) {
      await chat.save();
    }

    return readCount;
  }

  /**
   * Проверить, прочитано ли сообщение конкретным пользователем
   * @param {IMessage} message - Сообщение
   * @param {string} userId - ID пользователя
   * @returns {boolean}
   */
  static isReadByUser(message: IMessage, userId: string): boolean {
    return !!(message.readStatus && message.readStatus[userId]);
  }

  /**
   * Проверить, прочитано ли сообщение ХОТЯ БЫ ОДНИМ пользователем
   * @param {IMessage} message - Сообщение
   * @returns {boolean}
   */
  static isReadByAnyone(message: IMessage): boolean {
    return !!(message.readStatus && Object.keys(message.readStatus).length > 0);
  }
}

export default ChatModule;
