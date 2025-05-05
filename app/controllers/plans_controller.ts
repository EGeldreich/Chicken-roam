import Element from '#models/element'
import Plan from '#models/plan'
import ObjectiveService from '#services/objective_service'
import type { HttpContext } from '@adonisjs/core/http'
import { PlanState } from '#models/plan'
import { planNameValidator, enclosureCompletionValidator } from '#validators/plan'
import vine, { errors } from '@vinejs/vine'

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
    const plan = await Plan.query().where('id', params.id).preload('objectives').first()

    // Redirect when calling a non existing plan
    if (!plan) {
      session.flash('error', 'You cannot access this plan')
      return response.redirect().toRoute('user-page')
    }

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
    const validatedData = await request.validateUsing(enclosureCompletionValidator)

    try {
      // Find plan
      const plan = await Plan.findOrFail(params.planId)

      // Update plan status or perform any necessary calculations
      plan.isEnclosed = true
      plan.state = PlanState.ENCLOSED
      await plan.save()

      // Calculate area completion
      await ObjectiveService.calculateEnclosedCompletion(params.planId, validatedData.area)

      // Handle elements if needed
      if (validatedData.elementsToRemove && validatedData.elementsToRemove.length > 0) {
        // Delete elements that are now outside the enclosure
        await Element.query().whereIn('id', validatedData.elementsToRemove).delete()
      }

      await plan.load('objectives')

      // Get just the area objective using find
      const areaObjective = plan.objectives.find((obj) => obj.name === 'area')

      if (!areaObjective) {
        return response.badRequest({
          message: 'Area objective not found',
        })
      }
      return response.ok({
        message: 'Enclosure completed successfully',
        areaCompletion: areaObjective.$extras.pivot_completion_percentage,
        elementsUpdated: validatedData.elementsToUpdate ? validatedData.elementsToUpdate.length : 0,
        elementsRemoved: validatedData.elementsToRemove ? validatedData.elementsToRemove.length : 0,
        newState: plan.state,
      })
    } catch (error) {
      console.error('Error in completeEnclosure:', error)
      return response.internalServerError({
        message: 'Failed to complete enclosure',
        error: error.message,
        stack: error.stack,
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
      console.error('Error deleting the plan: ', error)
      session.flash('error', 'An error occurred while deleting the plan')
      return response.redirect().toRoute('user-page')
    }
  }
  //
  //
  //
  async rename({ params, response, auth, request, session }: HttpContext) {
    try {
      // Use validator
      const { newName } = await request.validateUsing(planNameValidator)

      // Find user
      const user = auth.user!
      // Find plan
      const plan = await Plan.findOrFail(params.id)

      // Security check to see if plan belongs to user
      if (plan.userId === user.id) {
        // Rename plan
        plan.name = newName
        plan.save()
        session.flash('success', 'Plan renamed successfully')
      } else {
        session.flash('error', 'You do not have permission to rename this plan')
      }
      return response.redirect().toRoute('plan', { id: params.id })
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        session.flash('error', 'This plan name is invalid, 50 characters max')
      } else {
        console.error('Error updating plan name: ', error)
        session.flash('error', 'An error occurred while updating the plan name')
      }
      return response.redirect().toRoute('plan', { id: params.id })
    }
  }
  //
  //
  //
  async duplicate({ params, response, session, auth }: HttpContext) {
    try {
      // Find user
      const user = auth.user!

      // Find plan to copy
      const originalPlan = await Plan.query()
        .where('id', params.id)
        .preload('objectives')
        .firstOrFail()

      // Check if the plan is the user's (security)
      if (originalPlan.userId !== user.id) {
        session.flash('error', 'You do not have permission to duplicate this plan')
        return response.redirect().toRoute('user-page')
      }

      // Create new plan with the same data
      const newPlan = await Plan.create({
        name: `copy of ${originalPlan.name}`,
        nbChickens: originalPlan.nbChickens,
        isCompleted: originalPlan.isCompleted,
        userId: user.id,
        state: originalPlan.state,
        isEnclosed: originalPlan.isEnclosed,
      })

      // Prepare objective pivot data
      const objectivePivotData: {
        [key: number]: { completion_percentage: number; target_value: number }
      } = {}

      // Get objectives from the original plan
      for (const objective of originalPlan.objectives) {
        objectivePivotData[objective.id] = {
          completion_percentage: objective.$extras.pivot_completion_percentage,
          target_value: objective.$extras.pivot_target_value,
        }
      }

      // Attach pivot data to new plan
      await newPlan.related('objectives').attach(objectivePivotData)

      // Flash and redirection
      session.flash('success', 'Plan duplicated successfully')
      return response.redirect().toRoute('user-page')
    } catch (error) {
      console.error('Error duplicating plan:', error)
      session.flash('error', 'An error occurred while duplicating the plan')
      return response.redirect().toRoute('user-page')
    }
  }
  //
  //
  //
  async pdfTemplate({ view, request }: HttpContext) {
    const planName = request.input('planName', 'Chicken Plan')
    return view.render('pages/pdf/pdf_template', { planName })
  }
}
