import Element from '#models/element'
import Plan from '#models/plan'
import ObjectiveService from '#services/objective_service'
import type { HttpContext } from '@adonisjs/core/http'
import { PlanState } from '#models/plan'

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
    const { area, elementsToUpdate = [], elementsToRemove = [] } = request.body()
    try {
      // Find plan
      const plan = await Plan.findOrFail(params.planId)

      console.log('Plan found:', plan.id)
      console.log('Area received:', area)

      // Get previous state for later logic
      // const previousState = plan.state || 'construction'

      // Update plan status or perform any necessary calculations
      plan.isEnclosed = true
      plan.state = PlanState.ENCLOSED
      await plan.save()

      // Calculate area completion
      await ObjectiveService.calculateEnclosedCompletion(params.planId, area)

      // Handle elements if needed
      if (elementsToRemove.length > 0) {
        // Delete elements that are now outside the enclosure
        await Element.query().whereIn('id', elementsToRemove).delete()

        console.log(`Removed ${elementsToRemove.length} elements outside the enclosure`)
      }

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
        elementsUpdated: elementsToUpdate.length,
        elementsRemoved: elementsToRemove.length,
        newState: plan.state,
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
  //
  //
  //
  async getPlanState({ params, response }: HttpContext) {
    try {
      const plan = await Plan.findOrFail(params.id)

      return response.ok({
        state: plan.state || 'construction', // Default to 'construction' if not set
        isEnclosed: plan.isEnclosed,
      })
    } catch (error) {
      console.error('Error getting plan state:', error)
      return response.internalServerError({
        message: 'Failed to get plan state',
        error: error.message,
      })
    }
  }
  //
  //
  //
  async delete({ params, response, session, auth }: HttpContext) {
    try {
      // Find user
      const user = auth.user!
      // Find plan
      const plan = await Plan.findOrFail(params.id)

      // Security check to see if plan belongs to user
      if (plan.userId === user.id) {
        // Delete plan
        await plan.delete()
        session.flash('success', 'Plan deleted successfully')
      } else {
        session.flash('error', 'You do not have permission to delete this plan')
      }
      return response.redirect().toRoute('user-page')
    } catch (error) {
      console.error('Error deleting the plan; ', error)
      session.flash('error', 'An error occurred while deleting the plan')
      return response.redirect().toRoute('user-page')
    }
  }
}
