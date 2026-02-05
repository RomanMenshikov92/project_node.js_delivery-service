import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

/**
 * Подключение к базе данных MongoDB
 */
const connectDB = async (): Promise<void> => {
  try {
    // Определение режима работы
    const isProduction: boolean = process.env.NODE_ENV === 'production';

    // URI Базы данных
    const mongoUri: string | undefined = process.env.MONGODB_URI;

    // Проверка наличия URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI is required');
    }

    // Установление соединения с MongoDB
    const conn: typeof mongoose = await mongoose.connect(mongoUri);

    console.log(
      `MongoDB Connected: ${conn.connection.host} in ${process.env.NODE_ENV || 'development'} mode`,
    );
  } catch (error: unknown) {
    // Обработка ошибки подключения
    if (error instanceof Error) {
      console.error(`Database connection error: ${error.message}`);
    } else {
      console.error(`Database connection error: ${String(error)}`);
    }
    // Завершение процесса при ошибке
    process.exit(1);
  }
};

export default connectDB;
