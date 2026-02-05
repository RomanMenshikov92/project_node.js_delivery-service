import type { Request, Response, NextFunction } from 'express';

// Интерфейс структурированной ошибки
interface ErrorResponse {
  error: {
    message: string;
    status: number;
  };
}

// Тип возможных ошибок
type AppError = Error | string | { message: string; status?: number; statusCode?: number };

/**
 * Middleware централизованной обработки ошибок
 * @param {AppError} err - Ошибка (объект, строка или объект с message)
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @param {NextFunction} next - Следующий middleware
 * @returns {void}
 */
export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Определение HTTP-статуса ошибки
  let statusCode: number = 500;
  let message: string = 'Internal Server Error';

  // Обработка объекта Error
  if (err instanceof Error) {
    message = err.message;
    statusCode = (err as any).status || (err as any).statusCode || 500;
  // Обработка объекта с сообщением
  } else if (typeof err === 'object' && err !== null && 'message' in err) {
    message = (err as { message: string }).message;
    statusCode = (err as { status?: number; statusCode?: number }).status || (err as { status?: number; statusCode?: number }).statusCode || 500;
  // Обработка строковой ошибки
  } else if (typeof err === 'string') {
    message = err;
  }

  // Нормализация HTTP-статуса
  if (statusCode < 400 || statusCode >= 600) {
    statusCode = 500;
  }

  // Логирование ошибки
  console.error(`[ERROR] ${req.method} ${req.path} - Status: ${statusCode}`, err instanceof Error ? err.stack : err);

  // Формирование JSON-ответа
  const errorResponse: ErrorResponse = {
    error: {
      message: message,
      status: statusCode,
    },
  };

  // Отправка JSON-ответа клиенту
  res.status(statusCode).json(errorResponse);
};

export default errorMiddleware;