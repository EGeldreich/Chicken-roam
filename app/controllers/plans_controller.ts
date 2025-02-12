import Plan from '#models/plan'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlansController {
  async guestPlan({ session, view }: HttpContext) {
    // Check if there's already a temporary plan ID in the session
    let plan = null
    const tempPlanId = session.get('temporaryPlanId')

    if (tempPlanId) {
      // Try to find the existing temporary plan
      plan = await Plan.find(tempPlanId)
    }

    if (!plan) {
      // Create a new temporary plan if none exists
      plan = await Plan.create({
        name: 'Guest Plan',
        isTemporary: true,
        nbChickens: 0,
        isCompleted: false,
      })

      // Store the plan ID in session
      session.put('temporaryPlanId', plan.id)
    }

    return view.render('pages/plan/plan', { plan })
  }
  //
  //

  async plan({ params, view, auth, response, session }: HttpContext) {
    const plan = await Plan.findOrFail(params.id)

    // Ensure the user can only access their own plans
    if (plan.userId !== auth.user!.id) {
      session.flash('error', 'You cannot access this plan')
      return response.redirect().toRoute('user-page')
    }

    return view.render('pages/plan/plan', { plan })
  }
}
