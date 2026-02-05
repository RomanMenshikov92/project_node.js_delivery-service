import { Server } from 'socket.io';
import ChatModule from '../modules/chat.module.js';
import { type IMessage } from '../models/message.model.js';
import { type IChat } from '../models/chat.model.js';
import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import { authenticateSocket, type AuthenticatedSocket } from '../middleware/socket.middleware.js';

// Глобальный объект для отслеживания онлайн-статуса пользователей
const onlineUsers = new Map<string, { socketId: string; lastActivity: Date }>();

// Отслеживание сокетов в чатах для отправки уведомлений о прочтении
const chatRooms = new Map<string, Set<string>>();

// Интерфейс данных отправки сообщения
interface SendMessageData {
  receiver: string;
  text: string;
}

/**
 * Настройка обработчиков Socket.IO
 * @param {Server} io - Сервер Socket.IO
 * @returns {void}
 */
export const setupSocketHandlers = (io: Server): void => {
  // Подключение клиента
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('User connected:', socket.id);

    // Применение Middleware аутентификации
    authenticateSocket(socket, error => {
      if (error) {
        socket.disconnect(true);
        return;
      }

      // Обработка аутентифицированного сокета
      handleAuthenticatedSocket(io, socket);
    });
  });
};

/**
 * Обработка аутентифицированного сокета
 * @param {Server} io - Сервер Socket.IO
 * @param {AuthenticatedSocket} socket - Аутентифицированный сокет
 * @returns {void}
 */
function handleAuthenticatedSocket(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.userId!;

  console.log(`Authenticated user connected: ${userId}`);

  // Добавление пользователя в онлайн
  onlineUsers.set(userId, { socketId: socket.id, lastActivity: new Date() });
  console.log(`Online users: ${onlineUsers.size}`);

  // Рассылка статуса онлайн
  io.emit('userStatus', { userId, status: 'online' });

  // Отправка списка онлайн-пользователей
  socket.emit('onlineUsers', Array.from(onlineUsers.keys()));

  // Обновление активности пользователя
  const updateActivity = () => {
    const user = onlineUsers.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  };

  // Автообновление активности
  socket.onAny(() => updateActivity());

  // Создание обработчика новых сообщений
  let messageHandler:
    | ((data: { chatId: string; message: IMessage; participants: string[] }) => void)
    | null = data => {
    const messageAuthor = data.message.author?.toString();
    if (messageAuthor === userId) {
      return;
    }

    // Отправка нового сообщения клиенту
    socket.emit('newMessage', {
      chatId: data.chatId,
      message: data.message,
    });
    console.log(
      `Emitted newMessage to socket ${socket.id} (user ${userId}) for chat ${data.chatId}`,
    );
  };

  // Подписка на новые сообщения
  ChatModule.subscribe(messageHandler);

  // Присоединение к существующим чатам пользователя
  joinUserChatRooms(userId, socket);

  // Функция присоединения к комнатам чатов
  async function joinUserChatRooms(userId: string, socket: AuthenticatedSocket) {
    try {
      const chats = await Chat.find({ users: userId });
      chats.forEach(chat => {
        const roomName = `chat_${chat._id.toString()}`;
        socket.join(roomName);

        // Отслеживание сокетов в чате
        const chatId = chat._id.toString();
        if (!chatRooms.has(chatId)) {
          chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId)!.add(socket.id);
      });
      console.log(`User ${userId} joined ${chats.length} chat rooms`);
    } catch (error) {
      // Обработка ошибок
      console.error('Error joining chat rooms:', error);
    }
  }

  // Получение истории сообщений
  socket.on('getHistory', async (receiverId: string) => {
    try {
      // Проверка существования получателя
      const receiverExists = await User.findById(receiverId);
      if (!receiverExists) {
        socket.emit('chatHistory', {
          error: 'Recipient not found',
          status: 'error',
        });
        return;
      }

      // Поиск чата между пользователями
      const chat: IChat | null = await ChatModule.find([userId, receiverId]); // Используем порядок [currentUser, receiver]
      if (!chat) {
        // Если чата нет, возвращаем пустую историю
        socket.emit('chatHistory', { data: [], status: 'ok' });
        console.log(
          `No chat found between user ${userId} and receiver ${receiverId}. Returning empty history.`,
        );
        return;
      }

      // Получение истории сообщений
      const history: IMessage[] = await ChatModule.getHistory(chat._id.toString());

      // Автоматическая пометка сообщений как прочитанных
      const readCount = await ChatModule.markAllAsRead(chat._id.toString(), userId);

      // Присоединение к комнате чата
      const roomName = `chat_${chat._id.toString()}`;
      socket.join(roomName);

      // Отслеживание сокета в чате для последующих уведомлений
      const chatId = chat._id.toString();
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, new Set());
      }
      chatRooms.get(chatId)!.add(socket.id);

      // Отправка уведомлений о прочтении авторам
      if (readCount > 0) {
        console.log(
          `Marked ${readCount} messages as read by user ${userId} in chat ${chatId}. Sending read notifications...`,
        );
        // Фильтрация сообщений
        const unreadMessages = chat.messages.filter(
          msg =>
            msg.author.toString() !== userId &&
            msg.readStatus &&
            msg.readStatus[userId],
        );

        // Рассылка уведомлений авторам
        unreadMessages.forEach(msg => {
          const authorId = msg.author.toString();
          const roomSockets = chatRooms.get(chatId);
          if (roomSockets) {
            roomSockets.forEach(socketId => {
              const targetSocket = io.sockets.sockets.get(socketId);
              if (
                targetSocket &&
                (targetSocket as any).request?.user?._id?.toString() === authorId
              ) {
                const readAtTimestamp = msg.readStatus?.[userId]?.toISOString();
                if (readAtTimestamp) {
                  targetSocket.emit('messageRead', {
                    chatId: chat._id.toString(),
                    messageId: msg._id.toString(),
                    readAt: readAtTimestamp,
                    readerId: userId,
                  });
                  console.log(
                    `Sent read notification for message ${msg._id} to author ${authorId}`,
                  );
                } else {
                  console.warn(
                    `Expected readStatus[${userId}] for message ${msg._id} but got undefined after filter check.`,
                  );
                }
              }
            });
          }
        });
      }

      // Отправка истории клиенту
      socket.emit('chatHistory', { data: history, status: 'ok' });
      console.log(`Sent history of ${history.length} messages to user ${userId} for chat with ${receiverId}.`);
    } catch (error: unknown) {
      // Обработка ошибок
      console.error('Get history error:', error);
      socket.emit('chatHistory', {
        error: 'Internal server error',
        status: 'error',
      });
    }
  });

  // Отправка нового сообщения
  socket.on('sendMessage', async (data: SendMessageData) => {
    try {
      const { receiver, text } = data;

      // Валидация входных данных
      if (!receiver || !text) {
        socket.emit('error', {
          error: 'Missing receiver or text',
          status: 'error',
        });
        return;
      }

      // Проверка существования получателя
      const receiverExists = await User.findById(receiver);
      if (!receiverExists) {
        socket.emit('error', {
          error: 'Recipient not found',
          status: 'error',
        });
        return;
      }

      // Отправка сообщения через модуль
      await ChatModule.sendMessage({
        author: userId,
        receiver,
        text,
      });

      // Присоединение к комнате чата
      const chat = await ChatModule.find([userId, receiver]);
      if (chat) {
        const roomName = `chat_${chat._id.toString()}`;
        socket.join(roomName);

        // Добавление сокета в отслеживание чата
        const chatId = chat._id.toString();
        if (!chatRooms.has(chatId)) {
          chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId)!.add(socket.id);
      }

      // Подтверждение успешной отправки
      socket.emit('sendMessage', { status: 'ok' });
    } catch (error: unknown) {
      // Обработка ошибок
      console.error('Send message error:', error);
      socket.emit('error', {
        error: 'Internal server error',
        status: 'error',
      });
    }
  });

  // Пометка сообщения как прочитанного
  socket.on('markAsRead', async (data: { chatId: string; messageId: string }) => {
    try {
      const { chatId, messageId } = data;

      // Валидация входных данных
      if (!chatId || !messageId) {
        socket.emit('error', {
          error: 'Missing chatId or messageId',
          status: 'error',
        });
        return;
      }

      // Пометка сообщения как прочитанного
      const message = await ChatModule.markAsRead(chatId, messageId, userId);

      // Проверка результата
      if (!message) {
        socket.emit('error', {
          error: 'Message not found or you are not a participant',
          status: 'error',
        });
        return;
      }

      // Подтверждение успешной пометки
      socket.emit('markAsRead', { status: 'ok' });
    } catch (error: unknown) {
      // Обработка ошибок
      console.error('Mark as read error:', error);
      socket.emit('error', {
        error: 'Internal server error',
        status: 'error',
      });
    }
  });

  // Запрос статуса пользователя
  socket.on('getUserStatus', (targetUserId: string) => {
    const user = onlineUsers.get(targetUserId);
    if (user) {
      socket.emit('userStatus', { userId: targetUserId, status: 'online' });
    } else {
      socket.emit('userStatus', { userId: targetUserId, status: 'offline' });
    }
  });

  // Отключение клиента
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Удаление сокета из комнат чатов
    chatRooms.forEach((sockets, chatId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        chatRooms.delete(chatId);
      }
    });

    // Удаление пользователя из онлайн
    onlineUsers.delete(userId);
    console.log(`Online users: ${onlineUsers.size}`);

    // Рассылка статуса оффлайн
    io.emit('userStatus', { userId, status: 'offline' });

    // Отписка от сообщений
    if (messageHandler) {
      ChatModule.unsubscribe(messageHandler);
    }
  });
}
