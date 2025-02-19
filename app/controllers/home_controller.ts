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
  //
  onboarding({ view }: HttpContext) {
    return view.render('pages/onboarding/onboarding')
  }
  //
  //
  //
  async guestLanding({ request, response }: HttpContext) {
    // Validate input
    const { nbChickens } = await request.validateUsing(onboardingValidator)

    // Create new plan
    const plan = await Plan.create({
      name: `Plan ${DateTime.now().toFormat('yyyy-MM-dd HH:mm')}`, // Default name
      nbChickens,
      isCompleted: false,
      userId: null,
    })

    // Retrieve all objectives
    const objectives = await Objective.all()

    // Prepare pivot data to attach objectives
    const objectivePivotData: {
      [key: number]: { completion_percentage: number; target_value: number }
    } = objectives.reduce(
      (
        acc: { [key: number]: { completion_percentage: number; target_value: number } },
        objective
      ) => {
        const targetValue = Math.ceil(nbChickens / objective.perNbChicken) * objective.goal
        acc[objective.id] = { completion_percentage: 0, target_value: targetValue }
        return acc
      },
      {}
    )

    // Attach objectives to the plan
    await plan.related('objectives').attach(objectivePivotData)

    // Redirect to plan editor
    return response.redirect().toRoute('guest-plan')
  }
  //
  //
  //
  async userLanding({ request, response, auth }: HttpContext) {
    // Validate input
    const { nbChickens } = await request.validateUsing(onboardingValidator)

    // Get user
    const user = auth.user!
    // Create new plan
    const plan = await Plan.create({
      name: `Plan ${DateTime.now().toFormat('yyyy-MM-dd HH:mm')}`, // Default name
      nbChickens,
      isCompleted: false,
      userId: user.id, // Inputs userId if a user is logged
    })

    // Retrieve all objectives
    const objectives = await Objective.all()

    // Prepare pivot data to attach objectives
    const objectivePivotData: {
      [key: number]: { completion_percentage: number; target_value: number }
    } = objectives.reduce(
      (
        acc: { [key: number]: { completion_percentage: number; target_value: number } },
        objective
      ) => {
        const targetValue = Math.ceil(nbChickens / objective.perNbChicken) * objective.goal
        acc[objective.id] = { completion_percentage: 0, target_value: targetValue }
        return acc
      },
      {}
    )

    // Attach objectives to the plan
    await plan.related('objectives').attach(objectivePivotData)

    // Redirect to plan editor
    return response.redirect().toRoute('plan', { id: plan.id })
  }
}
