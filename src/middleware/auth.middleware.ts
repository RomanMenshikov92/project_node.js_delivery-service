import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware проверки аутентификации
 * @param {Request} req - Запрос Express
 * @param {Response} res - Ответ Express
 * @param {NextFunction} next - Следующий middleware
 * @returns {void}
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  // Проверка аутентификации пользователя
  if (req.isAuthenticated()) {
    // Передача управления следующему middleware
    return next();
  }

  // Отправка ошибки не аутентифицированного доступа
  res.status(401).json({ error: 'Необходима аутентификация', status: 'error' });
};
