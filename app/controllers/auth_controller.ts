import { registerUserValidator, loginUserValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  //
  //
  // Render register view
  register({ view }: HttpContext) {
    return view.render('pages/auth/register')
  }
  //
  // Handle register
  async handleRegister({ request, session, response }: HttpContext) {
    // Get informations from request and validate them
    const { username, email, password } = await request.validateUsing(registerUserValidator)

    // Create new user in DB
    await User.create({ username, email, password })
    // Add flash message and redirect
    session.flash('success', 'Register Ok')
    return response.redirect().toRoute('home')
  }
  //
  //
  // Render login view
  login({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }
  //
  // Handle login
  async handleLogin({ request, auth, session, response }: HttpContext) {
    // Get informations from request and validate them
    const { email, password } = await request.validateUsing(loginUserValidator)
    // Compare inputs with database values
    // Automatically send Invalid Credentials error if no match
    const user = await User.verifyCredentials(email, password)
    // Log in user
    await auth.use('web').login(user)
    // Add flash message and redirect
    session.flash('success', 'You are logged in')
    return response.redirect().toRoute('home')
  }
  //
  //
  // Handle Log out
  async logout({ auth, session, response }: HttpContext) {
    // Use the guard .logout() method to logout (delete user from session)
    await auth.use('web').logout()
    // Add flash message and redirect
    session.flash('success', 'You are logged out')
    return response.redirect().toRoute('auth.login')
  }
}
