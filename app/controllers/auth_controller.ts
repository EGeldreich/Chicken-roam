import { registerUserValidator, loginUserValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Plan from '#models/plan'
import db from '@adonisjs/lucid/services/db'

export default class AuthController {
  //
  //
  // Render register view
  register({ view }: HttpContext) {
    return view.render('pages/auth/register')
  }
  //
  // Handle register
  async handleRegister({ request, session, response, auth }: HttpContext) {
    // Get informations from request and validate them
    const { username, email, password, gdpr } = await request.validateUsing(registerUserValidator)

    // Create new user in DB and save
    const user = await User.create({ username, email, password })

    // Check if there's a temporary plan to convert
    const tempPlanId = session.get('temporaryPlanId')
    if (tempPlanId) {
      const temporaryPlan = await Plan.find(tempPlanId)

      if (temporaryPlan) {
        // Start a transaction to ensure data consistency
        const trx = await db.transaction()

        // Update the plan using the transaction
        await temporaryPlan
          .merge({
            userId: user.id,
            isTemporary: false,
          })
          .useTransaction(trx)
          .save()

        await trx.commit()
        session.forget('temporaryPlanId')
      }
    }

    // Log in
    await auth.use('web').login(user)

    // Add flash message and redirect
    session.flash('success', 'Register Ok')
    return response.redirect().toRoute('user-page')
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
    await auth.use('web').login(
      user,
      /**
       * Generate token when "remember_me" input exists
       */
      !!request.input('remember_me')
    )
    // Add flash message and redirect
    session.flash('success', 'You are logged in')
    return response.redirect().toRoute('user-page')
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
