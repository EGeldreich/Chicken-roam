import Plan from '#models/plan'
import ObjectiveService from '#services/objective_service'
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
  async completeEnclosure({ params, response, request }: HttpContext) {
    const area = request.input('area')
    try {
      // Find plan
      const plan = await Plan.findOrFail(params.planId)

      console.log('Plan found:', plan.id)
      console.log('Area received:', area)

      // Update plan status or perform any necessary calculations
      plan.isEnclosed = true
      await plan.save()

      // Calculate area completion
      await ObjectiveService.calculateEnclosedCompletion(params.planId, area)

      await plan.load('objectives')

      // Get just the area objective using find
      const areaObjective = plan.objectives.find((obj) => obj.name === 'area')

      if (!areaObjective) {
        return response.badRequest({
          message: 'Area objective not found',
        })
      }
      console.log('target area: ' + areaObjective.$extras.pivot_target_value)
      console.log('areaCompletion: ' + areaObjective.$extras.pivot_completion_percentage)
      return response.ok({
        message: 'Enclosure completed successfully',
        areaCompletion: areaObjective.$extras.pivot_completion_percentage,
      })
    } catch (error) {
      console.error('Error in completeEnclosure:', error) // Add detailed error logging
      return response.internalServerError({
        message: 'Failed to complete enclosure',
        error: error.message,
        stack: error.stack, // This will help debug the issue
      })
    }
  }
}
