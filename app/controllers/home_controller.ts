import Objective from '#models/objective'
import Plan from '#models/plan'
import { onboardingValidator } from '#validators/home'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class HomeController {
  //
  homePage({ view }: HttpContext) {
    return view.render('pages/home')
  }
  //
  onboarding({ view }: HttpContext) {
    return view.render('pages/onboarding/onboarding')
  }
  //
  //
  //
  async handleLanding({ request, response, auth }: HttpContext) {
    try {
      // Validate input
      const { nbChickens } = await request.validateUsing(onboardingValidator)

      // Create new plan
      const plan = await Plan.create({
        name: `Plan ${DateTime.now().toFormat('yyyy-MM-dd HH:mm')}`, // Default name
        nbChickens,
        isCompleted: false,
        userId: auth.user?.id, // If using authentication
      })

      // Retrieve all objectives
      const objectives = await Objective.all()

      // Prepare pivot data for attaching objectives
      const objectivePivotData: { [key: number]: { completionPercentage: number } } =
        objectives.reduce((acc: { [key: number]: { completionPercentage: number } }, objective) => {
          acc[objective.id] = { completionPercentage: 0 }
          return acc
        }, {})

      // Attach objectives to the plan
      await plan.related('objectives').attach(objectivePivotData)

      // Redirect to plan editor
      return response.redirect().toRoute('plans.edit', { id: plan.id })
    } catch (error) {
      // Handle errors appropriately
      console.error(error)
      return response.redirect().back()
    }
  }
}
