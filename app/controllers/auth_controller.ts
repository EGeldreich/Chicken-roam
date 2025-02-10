import { registerUserValidator, loginUserValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  //
  register({ view }: HttpContext) {
    return view.render('pages/auth/register')
  }
  //
  async handleRegister({ request, session, response }: HttpContext) {
    const { username, email, password } = await request.validateUsing(registerUserValidator)

    await User.create({ username, email, password })
    session.flash('success', 'Register Ok')
    return response.redirect().toRoute('home')
  }
  //
  //
  login({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }
  //
  async handleLogin({ request, auth, session, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginUserValidator)

    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user)
    session.flash('success', 'You are logged in')
    return response.redirect().toRoute('home')
  }
  //
  //
  async logout({ auth, session, response }: HttpContext) {
    await auth.use('web').logout()

    session.flash('success', 'You are logged out')

    return response.redirect().toRoute('auth.login')
  }
}
