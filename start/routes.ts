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
import UsersController from '#controllers/users_controller'
import HomeController from '#controllers/home_controller'
import PlansController from '#controllers/plans_controller'
import ElementsController from '#controllers/elements_controller'
import FencesController from '#controllers/fences_controller'
import VerticesController from '#controllers/vertices_controller'

router.on('/').render('pages/onboarding/onboarding').as('onboarding')
router.get('/home', [HomeController, 'homePage']).as('home')
router.get('/about', [HomeController, 'about']).as('about')
router.get('/gdpr', [HomeController, 'gdpr']).as('gdpr')

// ELEMENTS
router.post('/api/elements', [ElementsController, 'create'])
router.get('/api/elements/:planId', [ElementsController, 'getByPlan'])
router.patch('/api/elements/:id/position', [ElementsController, 'updatePosition'])
router.patch('/api/elements/:id/upgrade', [ElementsController, 'upgradeElement'])
router.delete('/api/elements/:id', [ElementsController, 'delete'])

// FENCES
router.get('/api/fences/:planId', [FencesController, 'getByPlan'])
router.post('/api/fences', [FencesController, 'create'])
router.delete('/api/fences/:id', [FencesController, 'delete'])
router.patch('/api/fences/:id', [FencesController, 'update'])
router.patch('/api/fences/:id/link', [FencesController, 'link'])
router.patch('/api/fences/:id/upgrade', [FencesController, 'upgradeFence'])
router.patch('/api/fences/:id/downgrade', [FencesController, 'downgradeFence'])
router.post('/api/fences/create-from-vertices', [FencesController, 'createFromVertices'])

// PLANS
router.post('/api/plans/:planId/complete-enclosure', [PlansController, 'completeEnclosure'])

// VERTICES
router.post('/api/vertices', [VerticesController, 'create'])
router.patch('/api/vertices/:id/position', [VerticesController, 'updatePosition'])

// NEED GUEST
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

    router.post('/plan/guest', [HomeController, 'guestLanding'])
    router.get('/guest', [UsersController, 'guestPage']).as('guest-page')

    router.get('/plan', [PlansController, 'guestPlan']).as('guest-plan')
  })
  .use(middleware.guest())

// NEED AUTH
router
  .group(() => {
    router.delete('/login', [AuthController, 'logout']).as('auth.logout')
    router.get('/user', [UsersController, 'userPage']).as('user-page')
    router.get('/user/edit-email', [UsersController, 'editEmail']).as('edit-email')
    router.post('/user/edit-email', [UsersController, 'handleEditEmail'])
    router.get('/user/edit-password', [UsersController, 'editPassword']).as('edit-password')
    router.post('/user/edit-password', [UsersController, 'handleEditPassword'])
    router.get('/user/edit-username', [UsersController, 'editUsername']).as('edit-username')
    router.post('/user/edit-username', [UsersController, 'handleEditUsername'])
    router.delete('/user', [UsersController, 'deleteAccount']).as('user-destroy')

    router.post('/plan', [HomeController, 'userLanding'])

    router.get('/plan/:id', [PlansController, 'plan']).as('plan')
    router.post('/plan/:id/delete', [PlansController, 'delete']).as('delete-plan')
    router.post('/plan/:id/rename', [PlansController, 'rename']).as('rename-plan')
  })
  .use(middleware.auth())

// PLANS
router.get('/api/plans/:id/state', [PlansController, 'getPlanState'])
