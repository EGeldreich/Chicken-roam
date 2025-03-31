import User from '#models/user'
import { editEmailValidator, editPasswordValidator, editUsernameValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  //
  //
  // Render user page view
  async userPage({ view, auth }: HttpContext) {
    // Get user and preload plan_objectives
    const user = await User.query()
      .where('id', auth.user!.id)
      .preload('plans', (plansQuery) => {
        plansQuery.preload('objectives')
      })
      .firstOrFail()

    // Create a new dataset to export to view
    // Will include user info
    // and each user's plan info + completion percentage
    const viewData = {
      // user { userInfo, plans}
      user: {
        // Convert Lucid model to JSON
        ...user.toJSON(),
        plans: user.plans.map((plan) => {
          // Initialize completionPercentage
          let completionPercentage = 0

          // Calculate correct completionPercentage
          if (plan.objectives && plan.objectives.length > 0) {
            const totalCompletion =
              plan.objectives.reduce((sum, objective) => {
                return sum + objective.$extras.pivot_completion_percentage
              }, 0) / plan.objectives.length

            // Round it
            completionPercentage = Math.round(totalCompletion)
          }

          // plans : return plan Lucid model info + completion percentage
          return {
            ...plan.toJSON(),
            completionPercentage,
          }
        }),
      },
    }

    return view.render('pages/user/user_page', viewData)
  }
  //
  //
  // Render edit username view
  editUsername({ view }: HttpContext) {
    return view.render('pages/user/edit_username')
  }
  //
  // Handle username edition
  async handleEditUsername({ request, session, response, auth }: HttpContext) {
    // Ensure user is logged in (should not happen since the route is protected)
    if (!auth.user) {
      session.flash('error', 'You must be logged in')
      return response.redirect().toRoute('login')
    }

    // Get username from request and validate it
    const { username } = await request.validateUsing(editUsernameValidator)
    // Find the logged user
    const user = auth.user!
    // Update logged User's username
    await user.merge({ username }).save()

    // Flash and redirect
    session.flash('success', 'Username successfully updated')
    return response.redirect().toRoute('user-page')
  }
  //
  //
  // Render edit user email view
  editEmail({ view }: HttpContext) {
    return view.render('pages/user/edit_email')
  }
  //
  // Handle email edition
  async handleEditEmail({ request, session, response, auth }: HttpContext) {
    // Ensure user is logged in (should not happen since the route is protected)
    if (!auth.user) {
      session.flash('error', 'You must be logged in')
      return response.redirect().toRoute('login')
    }

    // Get email from request and validate it
    const { email } = await request.validateUsing(editEmailValidator)
    // Find the logged user
    const user = auth.user!
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
    // Verify the current password
    const user = await User.verifyCredentials(auth.user!.email, curPassword)

    // If verification passed, update with new password
    await user.merge({ password: newPassword }).save()

    session.flash('success', 'Password successfully updated')
    return response.redirect().toRoute('user-page')
  }
  //
  //
  // User deletion
  async deleteAccount({ auth, session, response }: HttpContext) {
    // Ensure user is logged in (should not happen since the route is protected)
    if (!auth.user) {
      session.flash('error', 'You must be logged in')
      return response.redirect().toRoute('login')
    }
    // Get user
    const user = auth.user!
    await user.delete()
    // Flash and redirect
    session.flash('success', 'Account deletion successful')
    return response.redirect().toRoute('home')
  }
}
