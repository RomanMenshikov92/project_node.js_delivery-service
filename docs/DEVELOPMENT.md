# Руководство разработчика

Этот документ описывает процесс разработки, сборки, запуска и тестирования проекта.

---

## Требования

- **Node.js** (v20 или выше)
- **npm** (или другой менеджер пакетов)
- **MongoDB** (для локального запуска без Docker)
- **Docker** (опционально, но рекомендуется)
- **Docker Compose** (опционально, но рекомендуется)

## Установка зависимостей

1.  Убедитесь, что вы находитесь в корне проекта.
2.  Выполните команду:

    ```bash
    npm install
    ```

    Это установит все зависимости, указанные в `package.json`.

## Настройка окружения

1.  Запустите скрипт настройки:

    ```bash
    npm run setup-env
    ```

    Скрипт создаст файл  `.env` с необходимыми переменными окружения.
2. После создания `.env` можно запускать приложение.


## Npm-scripts (локальная разработка)

|Команда|Назначение|Использование|
|--------|-----------|-----------|
| `npm run dev` | Запускает dev-сервер с hot-reload (порт `DEV_PORT` в `.env`, по умолчанию `3000`) | При написании кода |
| `npm run build` | Сборка TypeScript → JavaScript (`dist/`) | Перед запуском prod |
| `npm run start` | Запускает production-сервер из `dist/` но без `cross-env` | Используется в Docker-образе |
| `npm run prod` | Запуск production-сервера из `dist/` (порт из `PROD_PORT` в `.env`, по умолчанию `9999`) | Для тестирования собранного кода |
| `npm run preview` | Собрать и запустить production-версию локально (`npm run build && npm run prod`) | Быстрая проверка prod-сборки |
| `npm run lint` | Проверка кода на ошибки ESLint |
| `npm run lint:fix` | Автоисправление ошибок ESLint |
| `npm run format` | Форматирование кода через Prettier |
| `npm run format:check` | Проверка, соответствует ли код правилам Prettier |
| `npm run check` | Запуск проверки всего: ESLint + Prettier |
| `npm run setup-env` | Создает env с необходимыми переменными окружения |

## Docker (управление контейнерами)
- ### Быстрый старт

   #### - Разработка (Dev)
  ```bash
  # 1. Очистить старые данные MongoDB (опционально, но рекомендуется при проблемах)
  docker-compose down -v

  # 2. Запустить MongoDB база + веб-интерфейс в Docker
  docker-compose up -d mongo mongo-express

  # Запустить backend в режиме разработки
  npm run dev
  ```
  1. Сервер будет доступен по: `http://localhost:<DEV_PORT>` (по умолчанию `3000`)
  2. MongoDB работает в Docker, но доступна локально на `:27017`
  3. Можно запускать одновременно с Prod-сборкой (разные порты)

  #### - Локальное тестирование (prod-сборки)
  ```bash
  # 1. Очистить старые данные (опционально)
  docker-compose down -v

  # 2. Запустить только MongoDB база
  docker-compose up -d mongo

  # 3. Запустить backend в режиме production-версии
  npm run preview
  ```
  1. Сервер будет доступен по: `http://localhost:<PROD_PORT>` (по умолчанию `9999`)
  2. Используется локально собранный код из папки `dist/`
  3. Можно запускать одновременно с Dev (разные порты)

  #### - Финальная проверка перед деплоем
  ```bash
  # 1. Очистить старые данные (опционально)
  docker-compose down -v

  # 2. Остановить всё локальное
  pkill node

  # 3. Пересобрать всё и запустить всё в Docker
  docker-compose up --build -d
  ```
  1. Сервер будет доступен по: `http://localhost:<DEV_PROD>` (по умолчанию `9999`)
  2. Не запускайте `npm run preview` одновременно — конфликт портов!

- ### Основные команды управления

  #### - Запуск и остановка
  ```bash
  # Запустить всё в фоне
  docker-compose up -d

  # Пересобрать после изменений в коде или Dockerfile
  docker-compose up --build -d

  # Принудительная пересборка без кэша (при проблемах с зависимостями)
  docker-compose up --build --no-cache -d

  # Остановить всё (данные MongoDB сохраняются)
  docker-compose down

  # Остановить всё и удалить данные MongoDB (при смене кредов или проблемах)
  docker-compose down -v

  # Полная очистка: удалить контейнеры, тома (данные MongoDB) и образы
  # ВНИМАНИЕ: УДАЛЯЕТ ВСЕ ДАННЫЕ MongoDB и образы!
  docker-compose down --rmi all --volumes
  ```

  #### - Диагностика
  ```bash
  # Посмотреть все контейнеры (включая остановленные)
  docker ps -a

  # Посмотреть только запущенные
  docker ps

  # Логи конкретного сервиса
  docker-compose logs app
  docker-compose logs mongo
  docker-compose logs mongo-express

  # Следить за логами в реальном времени
  docker-compose logs -f app
  ```
## MongoDB (база данных)

- ### Подключение
  ```bash
  # Пример подключения значения из .env: MONGO_ROOT_USER и MONGO_ROOT_PASSWORD
  mongosh "mongodb://<MONGO_ROOT_USER>:<MONGO_ROOT_PASSWORD>@localhost:27017/delivery-service?authSource=admin"
  ```
  ```bash
  # Если меняли логин/пароль в .env, то сразу выполните:
  docker-compose down -v
  docker-compose up -d mongo
  ```
- ### Веб-интерфейс
  1. URL : `http://localhost:1111`
  2. Логин/пароль: значения *ME_USER / ME_PASSWORD* из ```.env```

## Best Practices
1. Не запускайте одновременно ```npm run dev``` и ```docker-compose up```, если оба используют одну MongoDB — возможны конфликты сессий.
2. После изменения ```.env``` перезапустите нужный сервис:
   ```bash
   docker-compose restart mongo
   # или
   docker-compose restart app
   ```
3. MongoDB не является HTTP-сервером. Открытие `http://localhost:27017` в браузере покажет пустую страницу.

## Порты и сервисы
|Название|URL|
|--------|-----------|
|Dev API|`http://localhost:<DEV_PORT>`|
|Prod API (Docker)|`http://localhost:<PROD_PORT>`|
|Mongo Express|`http://localhost:1111`|
|MongoDB|`localhost:27017` (только для клиентов)|
