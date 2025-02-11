import User from '#models/user'
import { editEmailValidator, editPasswordValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  //
  //
  // Render user page view
  userPage({ view }: HttpContext) {
    return view.render('pages/user/user_page')
  }
  //
  //
  // Render edit user email view
  editEmail({ view }: HttpContext) {
    return view.render('pages/user/edit_email')
  }
  //
  // Handle email edition
  async HandleEditEmail({ request, session, response, auth }: HttpContext) {
    // Ensure user is logged in (should not happen since the route is protected)
    if (!auth.user) {
      session.flash('error', 'You must be logged in')
      return response.redirect().toRoute('login')
    }

    // Get email from request and validate it
    const { email } = await request.validateUsing(editEmailValidator)
    // Find the logged user
    const user = auth.user
    // Update logged User's email
    await user.merge({ email }).save()

    // Flash and redirect
    session.flash('success', 'Email adress successfully updated')
    return response.redirect().toRoute('user-page')
  }
  //
  //
  // Render edit password view
  editPassword({ view }: HttpContext) {
    return view.render('pages/user/edit_password')
  }
  //
  // Handle password edition
  async handleEditPassword({ request, session, response, auth }: HttpContext) {
    // Ensure user is logged in (should not happen since the route is protected)
    if (!auth.user) {
      session.flash('error', 'You must be logged in')
      return response.redirect().toRoute('login')
    }

    // Get request information and validate them
    const { curPassword, newPassword } = await request.validateUsing(editPasswordValidator)

    try {
      // Verify the current password
      const user = await User.verifyCredentials(auth.user!.email, curPassword)

      // If verification passed, update with new password
      await user.merge({ password: newPassword }).save()

      session.flash('success', 'Password successfully updated')
      return response.redirect().toRoute('user-page')
    } catch (error) {
      // Wrong current password
      session.flash('error', 'Current password is incorrect')
      return response.redirect().back()
    }
  }
}
