import Plan from '#models/plan'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlansController {
  async guestPlan({ response, session, view }: HttpContext) {
    // Check if there's already a temporary plan ID in the session
    let plan = null
    const tempPlanId = session.get('temporaryPlanId')

    if (tempPlanId) {
      // Try to find the existing temporary plan
      try {
        plan = await Plan.query().where('id', tempPlanId).preload('objectives').first()
      } catch (error) {
        // Clear invalid plan id from session
        session.forget('temporaryPlanId')
      }
    }

    if (!plan) {
      // Redirect to onboarding
      return response.redirect().toRoute('onboarding')
    }

    return view.render('pages/plan/plan', { plan })
  }
  //
  //
  //
  async plan({ params, view, auth, response, session }: HttpContext) {
    const plan = await Plan.query().where('id', params.id).preload('objectives').firstOrFail()

    // Ensure the user can only access their own plans
    if (plan.userId !== auth.user!.id) {
      session.flash('error', 'You cannot access this plan')
      return response.redirect().toRoute('user-page')
    }

    return view.render('pages/plan/plan', { plan })
  }
  //
  //
  //
  async completeEnclosure({ params, response }: HttpContext) {
    try {
      const plan = await Plan.findOrFail(params.planId)

      // Update plan status or perform any necessary calculations
      plan.isEnclosed = true
      await plan.save()

      return response.ok({ message: 'Enclosure completed successfully' })
    } catch (error) {
      return response.internalServerError({
        message: 'Failed to complete enclosure',
        error: error.message,
      })
    }
  }
}
