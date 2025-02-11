import Token from '#models/token'
import User from '#models/user'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth'
import stringHelpers from '@adonisjs/core/helpers/string'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

export default class ResetPasswordController {
  // Render forgot_password view when called
  forgotPassword({ view }: HttpContext) {
    return view.render('pages/auth/forgot_password')
  }
  //
  //
  // When submitting the form
  async handleForgotPassword({ request, session, response }: HttpContext) {
    // Chek the input email using validator
    const { email } = await request.validateUsing(forgotPasswordValidator)
    // Find the user by email
    const user = await User.findBy('email', email)
    // If no user (email not used), OR password == null (registered via Oauth)
    if (!user || user.password === null) {
      // Set a flash msg
      session.flash('warning', 'This email is not linked to any account.')
      // Redirect to login
      return response.redirect().toRoute('auth.login')
    }
    // Get here if we get a user, ie if the email is in the DB
    // Generate a token
    const token = stringHelpers.generateRandom(64)
    // Generate url
    const url = `http://localhost:3333/reset-password?token=${token}&email=${email}`
    // Create new token in DB
    await Token.create({
      token,
      email: user.email,
      expiresAt: DateTime.now().plus({ minutes: 20 }),
    })

    // Email sending
    await mail.send((message) => {
      message
        .to(user.email)
        .from('no-reply@chicken-roam.fr')
        .subject('Chicken Roam reset password link')
        .htmlView('emails/forgot_password', { user, url })
    })

    // Set a flash msg
    session.flash('success', 'A link has been sent to your email adress.')
    // Redirect to login
    return response.redirect().toRoute('auth.login')
  }
  //
  //
  async resetPassword({ request, session, response, view }: HttpContext) {
    // Get email and token from the request
    const { token, email } = request.only(['token', 'email'])
    // Find the token in DB
    const tokenObj = await Token.findBy('token', token)
    // If no token found OR already used OR wrong email OR expired
    if (
      !tokenObj ||
      tokenObj.isUsed === true ||
      tokenObj.email != email ||
      DateTime.now() > tokenObj.expiresAt
    ) {
      // Redirect with error msg
      session.flash('error', 'Link expired or invalid')
      return response.redirect().toRoute('auth.forgot-password')
    }

    // Get here if everything is ok
    return view.render('pages/auth/reset_password', { token, email })
  }
  //
  //
  async handleResetPassword({ request, session, response }: HttpContext) {
    // Get informations from request and validate them
    const { email, password, token } = await request.validateUsing(resetPasswordValidator)
    // Find the token in DB
    const tokenObj = await Token.findBy('token', token)
    // If no token found OR already used OR wrong email OR expired
    if (
      !tokenObj ||
      tokenObj.isUsed === true ||
      tokenObj.email != email ||
      DateTime.now() > tokenObj.expiresAt
    ) {
      // Redirect with error msg
      session.flash('error', 'Link expired or invalid')
      return response.redirect().toRoute('auth.forgot-password')
    }
    // Find User in DB by email
    const user = await User.findBy('email', email)
    // If User not found
    if (!user) {
      session.flash('error', 'No account found with the email')
      return response.redirect().toRoute('auth.login')
    }
    // Set Token as used
    await tokenObj.merge({ isUsed: true }).save()
    // Update user Password
    await user.merge({ password }).save()

    // Flash and redirect
    session.flash('success', 'Password successfully updated')
    return response.redirect().toRoute('auth.login')
  }
}
