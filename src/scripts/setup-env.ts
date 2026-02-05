import fs from 'fs';
import readline from 'readline';

// Интерфейс для терминального ввода
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// Утилита асинхронного запроса
const ask = (q: string) => new Promise<string>(r => rl.question(q, a => r(a.trim())));

// Генератор случайных строк
const randStr = (len: number): string =>
  Array.from({ length: len }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
      .charAt(Math.floor(Math.random() * 94))
  ).join('');

// Основная функция настройки .env
async function setupEnv() {
  const example = '.env.example';
  const target = '.env';

  // Проверка наличия шаблона
  if (!fs.existsSync(example)) {
    console.error(`❌ Файл ${example} не найден.`);
    rl.close();
    return;
  }

  // Обработка существующего .env
  if (fs.existsSync(target)) {
    console.log(`⚠️  Файл ${target} уже существует.`);
    if ((await ask('Перезаписать? (yes/no): ')).toLowerCase() !== 'yes') {
      console.log('❌ Отменено.');
      rl.close();
      return;
    }
  }

  // Чтение содержимого шаблона
  let content = fs.readFileSync(example, 'utf8');
  console.log('\n🔧 Настройка .env...\n');

  // Выбор режима окружения
  let nodeEnvValue = '';
  while (true) {
    const input = await ask('NODE_ENV:\n1) development\n2) production\n→ ');
    if (input === '1') {
      nodeEnvValue = 'development';
      break;
    } else if (input === '2') {
      nodeEnvValue = 'production';
      break;
    } else {
      console.log('❌ Введите 1 или 2.');
    }
  }
  content = content.replace(/^NODE_ENV=.*/m, `NODE_ENV=${nodeEnvValue}`);
  console.log(`✅ NODE_ENV = ${nodeEnvValue}`);

  // Настройка путей и HTTPS
  content = content
    .replace(/^UPLOAD_PATH=.*/m, 'UPLOAD_PATH=uploads/')
    .replace(/^USE_HTTPS=.*/m, `USE_HTTPS=${nodeEnvValue === 'production' ? 'true' : 'false'}`);
  console.log('✅ UPLOAD_PATH = uploads/');
  console.log(`✅ USE_HTTPS = ${nodeEnvValue === 'production' ? 'true' : 'false'}`);

  // Конфигурация MongoDB
  const user = await ask('MONGO_ROOT_USER: ');
  const pass = await ask('MONGO_ROOT_PASSWORD: ');

  // Формирование URI подключения
const mongoUri = `mongodb://${user}:${pass}@localhost:27017/delivery-service?authSource=admin`;

  content = content
    .replace(/^MONGODB_URI=.*/m, `MONGODB_URI=${mongoUri}`)
    .replace(/^MONGO_ROOT_USER=.*/m, `MONGO_ROOT_USER=${user}`)
    .replace(/^MONGO_ROOT_PASSWORD=.*/m, `MONGO_ROOT_PASSWORD=${pass}`);
  console.log('✅ MONGODB_URI обновлён (localhost).');
  console.log('✅ Учетные данные MongoDB сохранены.');

  // Настройка опциональных переменных
  const optionalVars = [
    { key: 'HTTP_HOST', def: 'localhost' },
    { key: 'DEV_PORT', def: '3000' },
    { key: 'PROD_PORT', def: '9999' },
    { key: 'JWT_EXPIRES_IN', def: '24h' },
  ];

  for (const { key, def } of optionalVars) {
    const val = await ask(`${key} (оставьте пустым для "${def}"): `) || def;
    content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${val}`);
  }

  // Учетные данные Mongo Express
  const meUser = await ask('ME_USER: ');
  const mePass = await ask('ME_PASSWORD: ');
  content = content
    .replace(/^ME_USER=.*/m, `ME_USER=${meUser}`)
    .replace(/^ME_PASSWORD=.*/m, `ME_PASSWORD=${mePass}`);

  // Генерация секретных ключей
  const secrets = ['SESSION_SECRET', 'JWT_SECRET'];
  for (const key of secrets) {
    let val = await ask(`${key} (оставьте пустым для генерации): `);
    if (!val) {
      val = randStr(32);
      console.log(`  → Сгенерировано: ${val}`);
    }
    content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${val}`);
  }

  // Сохранение итогового файла
  fs.writeFileSync(target, content);
  console.log(`\n✅ Файл ${target} успешно создан!`);
  rl.close();
}

// Обработка ошибок запуска
setupEnv().catch(err => {
  console.error('❌ Ошибка:', err);
  rl.close();
});