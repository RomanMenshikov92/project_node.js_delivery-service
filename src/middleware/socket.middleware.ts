import { Socket } from 'socket.io';
import { type IUser } from '../models/user.model.js';


// Тип сокета с аутентификацией
export type AuthenticatedSocket = Socket & {
  request: Socket['request'] & {
    user?: IUser;
    session?: any;
  };
  testUserId?: string;
  userId?: string;
};

/**
 * Middleware аутентификации для сокетов
 * Проверка наличия пользователя в сессии и установка userId
 */
export const authenticateSocket = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): void => {
  // Получение пользователя из сессии
  let userId = socket.request.user?._id?.toString();

  // Резервный метод получения пользователя из сессии
  if (!userId && socket.request.session?.passport?.user) {
    userId = socket.request.session.passport.user;
  }

  // Резервный метод получения тестового пользователя
  if (!userId && socket.testUserId) {
    userId = socket.testUserId;
  }

  // Проверка аутентификации
  if (!userId) {
    console.log('Unauthenticated socket connection attempt');
    socket.emit('error', { error: 'Authentication required', status: 'error' });
    return next(new Error('Authentication required'));
  }

  // Установка userId для удобства в обработчиках
  socket.userId = userId;
  console.log(`Authenticated socket user: ${userId}`);

  next();
};

/**
 * Middleware проверки прав доступа к чату
 * Проверка участия пользователя в чате
 */
export const checkChatAccess = async (
  socket: AuthenticatedSocket,
  chatId: string,
  next: (err?: Error) => void
): Promise<void> => {
  const userId = socket.userId;

  // Проверка аутентификации
  if (!userId) {
    socket.emit('error', { error: 'Authentication required', status: 'error' });
    return next(new Error('Authentication required'));
  }

  try {
    const Chat = (await import('../models/chat.model.js')).default;
    const chat = await Chat.findById(chatId);

    // Проверка существования чата
    if (!chat) {
      socket.emit('error', { error: 'Chat not found', status: 'error' });
      return next(new Error('Chat not found'));
    }

    // Проверка участия пользователя в чате
    const isParticipant = chat.users.some(user => user.toString() === userId);

    // Проверка прав доступа
    if (!isParticipant) {
      socket.emit('error', { error: 'Access denied', status: 'error' });
      return next(new Error('Access denied'));
    }

    next();
  } catch (error) {
    // обработка ошибок
    socket.emit('error', { error: 'Internal server error', status: 'error' });
    next(error as Error);
  }
};