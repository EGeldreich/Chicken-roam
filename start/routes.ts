/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import AuthController from '#controllers/auth_controller'
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import ResetPasswordController from '#controllers/reset_password_controller'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('/register', [AuthController, 'register']).as('auth.register')
    router.post('/register', [AuthController, 'handleRegister'])
    router.get('/login', [AuthController, 'login']).as('auth.login')
    router.post('/login', [AuthController, 'handleLogin'])
    router
      .get('/forgot-password', [ResetPasswordController, 'forgotPassword'])
      .as('auth.forgot-password')
    router.post('/forgot-password', [ResetPasswordController, 'handleForgotPassword'])
    router
      .get('/reset-password', [ResetPasswordController, 'resetPassword'])
      .as('auth.reset-password')
    router.post('/reset-password', [ResetPasswordController, 'handleResetPassword'])
  })
  .use(middleware.guest())

router.delete('/login', [AuthController, 'logout']).as('auth.logout').use(middleware.auth())
