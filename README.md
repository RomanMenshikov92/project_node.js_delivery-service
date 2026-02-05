# Delivery Service Backend

- [Техническое задание](./docs/SPECIFICATION.md)
- [Руководство разработчика](./docs/DEVELOPMENT.md)
- [Результаты работ](./docs/RESULTS.md)

___
**Тема проекта:** Курсовой проект — бэкенд-приложение службы доставки.
___

## [Структура проекта](./project_structure.txt)

## Описание:

Этот проект представляет собой бэкенд-приложение службы доставки, реализованное на **Node.js** с использованием **TypeScript**, веб-фреймворка **Express**, нереляционной базы данных **MongoDB**, библиотеки **Socket.IO** для организации двунаправленной связи в реальном времени и механизмов аутентификации. Приложение предоставляет API для управления пользователями, объявлениями и чатами между пользователями.

---

## Стек технологий
- **Язык:** [Node.js](https://nodejs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Фреймворк:** [Express](https://expressjs.com/)
- **Базы Данных:** [MongoDB (Mongoose)](https://www.mongodb.com/)
- **Аутентификация:** [Passport.js](http://www.passportjs.org/), [express-session](https://github.com/expressjs/session), [connect-mongo](https://github.com/jdesboeufs/connect-mongo)
- **Файлы:** [Multer](https://github.com/expressjs/multer)
- **Веб-сокет:** [Socket.IO](https://socket.io/)
- **Сборка:** [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)
- **Форматирование и линтинг:** [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)

## Архитектура

Приложение следует модульной архитектуре, разделяя логику на:

- `config/` — настройки приложения (база данных, сессии, аутентификация, сокеты).
- `controllers/` — бизнес-логика, обрабатывающая HTTP-запросы.
- `middleware/` — промежуточные функции (аутентификация, обработка ошибок).
- `models/` — определения схем данных для MongoDB с использованием Mongoose.
- `modules/` — основные функциональные модули (пользователи, объявления, чат).
- `routes/` — определение маршрутов API.
- `app.ts` — основной файл запуска приложения, инициализация Express, подключение middleware, маршрутов и Socket.IO.

