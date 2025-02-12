import Plan from '#models/plan'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlansController {
  async guestPlan({ view }: HttpContext) {
    // This handles guest users who want to try out the planner
    // We create a temporary plan that won't be saved to the database
    const temporaryPlan = {
      id: 'guest',
      name: 'Guest Plan',
      nbChickens: 0,
      isCompleted: false,
    }

    return view.render('pages/plan/plan', { plan: temporaryPlan })
  }
  //
  //
  // Logged plan (can use id)
  async plan({ params, view }: HttpContext) {
    const plan = await Plan.findOrFail(params.id)

    return view.render('pages/plan/plan', { plan })
  }
}
