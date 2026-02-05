import { Router } from 'express';
import { signup, signin, signout } from '../controllers/auth.controller.js';
import { ensureAuthenticated } from '../middleware/auth.middleware.js';

// Инициализация роутера Express
const router: Router = Router();

// Регистрация маршрута регистрации
router.post('/signup', signup);
// Регистрация маршрута входа
router.post('/signin', signin);
// Регистрация маршрута выхода
router.post('/signout', ensureAuthenticated, signout);

export default router;
