/* eslint-disable no-undef */

// конфигурация
const CONFIG = {
  port: window.location.port || '3000',
  apiBase: `http://localhost:${window.location.port || '3000'}`,
  socketUrl: `http://localhost:${window.location.port || '3000'}`,
  transports: ['websocket', 'polling'],
};

// переменные
let socket = null;
let currentUserId = null;
let currentReceiverId = null;
let currentUser = null;
let ELEMENTS = {}; // Инициализируем пустым объектом

// функции
const utils = {
  // Форматирование времени
  formatTime: date =>
    new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),

  // Логирование
  log: message => console.log(`[Chat] ${message}`),

  // Показать статус в элементе
  showStatus: (element, message, type) => {
    // Проверяем, существует ли элемент перед его использованием
    if (!element) {
      console.error('Element is undefined in showStatus');
      return;
    }
    element.textContent = message;
    element.style.display = 'block';
    element.className = 'status';
    if (type === 'success') {
      element.classList.add('connected');
    } else if (type === 'error') {
      element.classList.add('error');
    } else if (type === 'disconnected') {
      element.classList.add('disconnected');
    }
  },

  // Обновление индикатора статуса пользователя
  updateUserStatusIndicator: status => {
    if (!ELEMENTS.userStatusIndicator) return;
    ELEMENTS.userStatusIndicator.className = 'user-status';
    if (status === 'online') {
      ELEMENTS.userStatusIndicator.classList.add('status-online');
    } else {
      ELEMENTS.userStatusIndicator.classList.add('status-offline');
    }
  },

  // Отображение сообщений
  displayMessages: messages => {
    // Проверяем, существует ли элемент перед его использованием
    if (!ELEMENTS.chatMessages) {
      console.error('chatMessages element is undefined in displayMessages');
      return;
    }
    if (messages.length === 0) {
      ELEMENTS.chatMessages.innerHTML = '<div class="no-messages">Нет сообщений</div>';
      utils.setInputState(false);
      return;
    }

    let html = '';
    messages.forEach(msg => {
      const isSent = msg.author._id === currentUserId || msg.author.toString() === currentUserId;
      const authorName = msg.author.name || (isSent ? 'Вы' : 'Собеседник');

      let deliveryStatus = '';
      if (isSent) {
        const isRead = msg.readStatus && Object.keys(msg.readStatus).length > 0;
        deliveryStatus = `<span class="delivery-status"><span class="check-double ${isRead ? 'read' : ''}">✓✓</span></span>`;
      }

      html += `
                <div class="message ${isSent ? 'sent' : 'received'}" data-id="${msg._id}">
                    <div class="author">${authorName}</div>
                    <div class="text">${msg.text}</div>
                    <div class="time">${utils.formatTime(msg.sentAt)}</div>
                    ${deliveryStatus}
                </div>
            `;
    });

    ELEMENTS.chatMessages.innerHTML = html;
    ELEMENTS.chatMessages.scrollTop = ELEMENTS.chatMessages.scrollHeight;
    utils.setInputState(false);
  },

  // Управление состоянием полей ввода и кнопок
  setInputState: isLoading => {
    // Проверяем, существуют ли элементы перед их использованием
    if (ELEMENTS.messageInput) ELEMENTS.messageInput.disabled = isLoading;
    const submitButton = ELEMENTS.messageForm?.querySelector('button');
    if (submitButton) submitButton.disabled = isLoading;
    if (ELEMENTS.getHistoryBtn) ELEMENTS.getHistoryBtn.disabled = isLoading;
    if (!isLoading && ELEMENTS.messageInput) {
      ELEMENTS.messageInput.focus();
    }
  },

  // Управление состоянием кнопок подключения к сокету
  setSocketButtonState: isConnected => {
    // Проверяем, существуют ли элементы перед их использованием
    if (ELEMENTS.connectBtn) ELEMENTS.connectBtn.disabled = isConnected;
    if (ELEMENTS.disconnectBtn) ELEMENTS.disconnectBtn.disabled = !isConnected;
  },

  // Управление видимостью секций
  toggleSections: (loginVisible, chatVisible, messagesVisible) => {
    // Проверяем, существуют ли элементы перед их использованием
    if (ELEMENTS.loginSection)
      ELEMENTS.loginSection.style.display = loginVisible ? 'block' : 'none';
    if (ELEMENTS.chatSection) ELEMENTS.chatSection.style.display = chatVisible ? 'block' : 'none';
    if (ELEMENTS.messagesSection)
      ELEMENTS.messagesSection.style.display = messagesVisible ? 'block' : 'none';
  },
};

// обработчики событий
const handlers = {
  // Вход
  onLogin: async event => {
    event.preventDefault();
    // Проверяем, существуют ли элементы перед их использованием
    const email = ELEMENTS.emailInput?.value.trim();
    const password = ELEMENTS.passwordInput?.value.trim();

    if (!email || !password) {
      utils.showStatus(ELEMENTS.loginStatus, 'Заполните поля', 'error');
      return;
    }

    // Проверяем, существует ли элемент перед его использованием
    if (ELEMENTS.loginBtn) {
      ELEMENTS.loginBtn.disabled = true;
    }
    utils.showStatus(ELEMENTS.loginStatus, 'Вход...', 'info');

    try {
      const response = await fetch(`${CONFIG.apiBase}/api/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.status === 'ok') {
        currentUser = data.data;
        currentUserId = currentUser.id;
        utils.showStatus(ELEMENTS.loginStatus, ' OK', 'success');
        utils.log(`User: ${currentUser.name}`);

        // Обновление UI после входа
        if (ELEMENTS.userName) ELEMENTS.userName.textContent = currentUser.name;
        if (ELEMENTS.userIdDisplay) ELEMENTS.userIdDisplay.textContent = currentUserId;
        utils.toggleSections(false, true, false);
      } else {
        utils.showStatus(ELEMENTS.loginStatus, `${data.error || 'Error'}`, 'error');
      }
    } catch (error) {
      utils.showStatus(ELEMENTS.loginStatus, 'Connection error', 'error');
      utils.log(`Error: ${error.message}`);
    } finally {
      // Проверяем, существует ли элемент перед его использованием
      if (ELEMENTS.loginBtn) {
        ELEMENTS.loginBtn.disabled = false;
      }
    }
  },

  // Подключение к сокету
  onConnectSocket: () => {
    utils.log(`Connect to ${CONFIG.socketUrl}`);
    utils.showStatus(ELEMENTS.connectionStatus, 'Подключение...', 'info');

    socket = io(CONFIG.socketUrl, { transports: CONFIG.transports });

    socket.on('connect', () => {
      utils.log(` Connected! ID: ${socket.id}`);
      utils.showStatus(ELEMENTS.connectionStatus, ` ${socket.id}`, 'success');
      utils.setSocketButtonState(true);
      utils.toggleSections(false, true, true);
    });

    socket.on('disconnect', reason => {
      utils.log(`Disconnected: ${reason}`);
      utils.showStatus(ELEMENTS.connectionStatus, `${reason}`, 'disconnected');
      utils.setSocketButtonState(false);
    });

    socket.on('error', data => {
      utils.log(`Error: ${JSON.stringify(data)}`);
      alert(`Error: ${data.error}`);
    });

    // Обработчики событий сокета
    socket.on('chatHistory', handlers.onChatHistory);
    socket.on('newMessage', handlers.onNewMessage);
    socket.on('sendMessage', handlers.onSendMessage);
    socket.on('messageRead', handlers.onMessageRead);
    socket.on('userStatus', handlers.onUserStatus);
    socket.on('onlineUsers', handlers.onOnlineUsers);
  },

  // Отключение от сокета
  onDisconnectSocket: () => {
    if (socket) {
      socket.disconnect();
    }
  },

  // Подключение к чату с пользователем
  onConnectChat: () => {
    // Проверяем, существуют ли элементы перед их использованием
    const receiverId = ELEMENTS.receiverIdInput?.value.trim();
    if (!receiverId) {
      alert('ID required');
      return;
    }
    if (!socket || !socket.connected) {
      alert('Connect to socket first');
      return;
    }

    currentReceiverId = receiverId;
    if (ELEMENTS.chatWith) ELEMENTS.chatWith.textContent = receiverId;
    if (ELEMENTS.chatMessages)
      ELEMENTS.chatMessages.innerHTML = '<div class="no-messages">Загрузка...</div>';
    utils.setInputState(true);

    socket.emit('getUserStatus', receiverId);
    utils.log(`Chat with: ${receiverId}`);
    socket.emit('getHistory', receiverId);
  },

  // Получение истории
  onGetHistory: () => {
    if (currentReceiverId && socket && socket.connected) {
      socket.emit('getHistory', currentReceiverId);
      socket.emit('getUserStatus', currentReceiverId);
    }
  },

  // Обработчик получения истории
  onChatHistory: data => {
    if (data.status === 'error') {
      utils.log(`History error: ${data.error}`);
      alert(`Error: ${data.error}`);
      return;
    }
    utils.log(` History: ${data.data.length} messages`);
    utils.displayMessages(data.data);
    if (currentReceiverId) {
      socket.emit('getUserStatus', currentReceiverId);
    }
  },

  // Обработчик нового сообщения
  onNewMessage: () => {
    if (currentReceiverId) {
      socket.emit('getHistory', currentReceiverId);
    }
  },

  // Обработчик отправки сообщения
  onSendMessage: data => {
    if (data.status === 'ok') {
      utils.log(' Sent');
      if (ELEMENTS.messageInput) ELEMENTS.messageInput.value = '';
      if (currentReceiverId) {
        socket.emit('getHistory', currentReceiverId);
      }
    }
  },

  // Обработчик уведомления о прочтении
  onMessageRead: data => {
    utils.log(`Сообщение прочитано: ${data.messageId}`);
    const messageElement = document.querySelector(`.message[data-id="${data.messageId}"]`);
    if (messageElement && messageElement.classList.contains('sent')) {
      const statusElement = messageElement.querySelector('.delivery-status');
      if (statusElement) {
        statusElement.innerHTML = '<span class="check-double read">✓✓</span>';
      }
    }
    // Обновляем историю для надёжности
    if (currentReceiverId) {
      setTimeout(() => {
        socket.emit('getHistory', currentReceiverId);
      }, 100);
    }
  },

  // Обработчик статуса пользователя
  onUserStatus: data => {
    if (data.userId === currentReceiverId) {
      utils.updateUserStatusIndicator(data.status);
    }
  },

  // Обработчик списка онлайн-пользователей
  onOnlineUsers: users => {
    utils.log(`Online users: ${users.length}`);
    if (currentReceiverId && users.includes(currentReceiverId)) {
      utils.updateUserStatusIndicator('online');
    }
  },

  // Отправка сообщения
  onSendMessageForm: event => {
    event.preventDefault();
    // Проверяем, существуют ли элементы перед их использованием
    const text = ELEMENTS.messageInput?.value.trim();
    if (!text || !currentReceiverId) return;
    if (!socket || !socket.connected) {
      alert('Socket not connected');
      return;
    }
    socket.emit('sendMessage', { receiver: currentReceiverId, text });
  },

  // Enter для отправки
  onMessageInputKeypress: event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (ELEMENTS.messageForm) {
        ELEMENTS.messageForm.requestSubmit();
      }
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  // ИНИЦИАЛИЗАЦИЯ ELEMENTS ВНУТРИ DOMContentLoaded
  ELEMENTS = {
    loginSection: document.getElementById('loginSection'),
    chatSection: document.getElementById('chatSection'),
    messagesSection: document.getElementById('messagesSection'),
    loginForm: document.getElementById('loginForm'),
    loginStatus: document.getElementById('loginStatus'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    userName: document.getElementById('userName'),
    userIdDisplay: document.getElementById('userIdDisplay'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    receiverIdInput: document.getElementById('receiverId'),
    connectChatBtn: document.getElementById('connectChatBtn'),
    getHistoryBtn: document.getElementById('getHistoryBtn'),
    chatMessages: document.getElementById('chatMessages'),
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('messageInput'),
    chatWith: document.getElementById('chatWith'),
    userStatusIndicator: document.getElementById('userStatusIndicator'),
  };

  // Привязка обработчиков к элементам
  // Проверяем, существуют ли элементы перед добавлением обработчиков
  if (ELEMENTS.loginForm) ELEMENTS.loginForm.addEventListener('submit', handlers.onLogin);
  if (ELEMENTS.connectBtn) ELEMENTS.connectBtn.addEventListener('click', handlers.onConnectSocket);
  if (ELEMENTS.disconnectBtn)
    ELEMENTS.disconnectBtn.addEventListener('click', handlers.onDisconnectSocket);
  if (ELEMENTS.connectChatBtn)
    ELEMENTS.connectChatBtn.addEventListener('click', handlers.onConnectChat);
  if (ELEMENTS.getHistoryBtn)
    ELEMENTS.getHistoryBtn.addEventListener('click', handlers.onGetHistory);
  if (ELEMENTS.messageForm)
    ELEMENTS.messageForm.addEventListener('submit', handlers.onSendMessageForm);
  if (ELEMENTS.messageInput)
    ELEMENTS.messageInput.addEventListener('keypress', handlers.onMessageInputKeypress);

  // Инициализация состояния кнопок
  if (ELEMENTS.disconnectBtn) utils.setSocketButtonState(false);
});
