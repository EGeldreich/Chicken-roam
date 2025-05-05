import Element from '#models/element'
import Vertex from '#models/vertex'
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import ObjectiveService from '#services/objective_service'
import Plan from '#models/plan'
import { elementValidator, elementPositionValidator } from '#validators/elements'

@inject()
export default class ElementsController {
  async create({ request, response }: HttpContext) {
    const validatedData = await request.validateUsing(elementValidator)
    const trx = await db.transaction()

    try {
      // Create vertex within transaction using validated data
      const vertex = await Vertex.create(
        {
          positionX: validatedData.positionX,
          positionY: validatedData.positionY,
          planId: validatedData.planId,
        },
        { client: trx }
      )

      // Create element within same transaction using validated data
      const element = await Element.create(
        {
          planId: validatedData.planId,
          type: validatedData.type,
          vertexId: vertex.id,
          objectiveValue: validatedData.objectiveValue,
          width: validatedData.width,
          height: validatedData.height,
          description: '',
        },
        { client: trx }
      )

      // If both operations succeed, commit the transaction
      await trx.commit()

      // Load the vertex relationship
      await element.load('vertex')

      // Recalculate objectives for this plan
      await ObjectiveService.recalculateForPlan(validatedData.planId)

      // Fetch the updated objectives
      const plan = await Plan.query()
        .where('id', validatedData.planId)
        .preload('objectives')
        .firstOrFail()

      // Return both the element and the updated objectives
      return response.created({
        element,
        objectives: plan.objectives.map((objective) => ({
          id: objective.id,
          name: objective.name,
          description: objective.description,
          target_value: objective.$extras.pivot_target_value,
          current_value: objective.$extras.pivot_current_value,
          completion_percentage: objective.$extras.pivot_completion_percentage,
          unit: objective.unit,
        })),
      })
    } catch (error) {
      // If anything fails, rollback to prevent partial data
      await trx.rollback()
      console.error('Error creating element:', error)
      return response.internalServerError({
        message: 'Failed to create element',
        error: error.message,
      })
    }
  }
  //
  //
  async getByPlan({ params, response }: HttpContext) {
    const elements = await Element.query().where('planId', params.planId).preload('vertex')

    return response.ok(elements)
  }
  //
  //
  async delete({ params, response }: HttpContext) {
    // Find element
    const element = await Element.findOrFail(params.id)
    // Get vertex
    const vertex = await Vertex.findOrFail(element.vertexId)

    // Get plan id
    const planId = element.planId

    // Delete element
    await element.delete()
    // Delete vertex
    await vertex.delete()

    // Recalculate objectives for this plan
    await ObjectiveService.recalculateForPlan(planId)

    const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()

    return response.status(200).json({
      objectives: plan.objectives.map((objective) => ({
        id: objective.id,
        name: objective.name,
        description: objective.description,
        target_value: objective.$extras.pivot_target_value,
        current_value: objective.$extras.pivot_current_value,
        completion_percentage: objective.$extras.pivot_completion_percentage,
        unit: objective.unit,
      })),
    })
  }
  //
  //
  async updatePosition({ params, response, request }: HttpContext) {
    const validatedData = await request.validateUsing(elementPositionValidator)

    try {
      // Use transaction for whole DB interaction
      const result = await db.transaction(async (trx) => {
        // Find element
        const element = await Element.findOrFail(params.id, { client: trx })

        // Find linked vertex
        element.useTransaction(trx)
        await element.load('vertex')
        // Update it
        const vertex = element.vertex
        vertex.positionX = validatedData.positionX
        vertex.positionY = validatedData.positionY

        // Save update
        vertex.useTransaction(trx)
        await vertex.save()
      })

      return response.ok({
        message: 'Element position updated successfully',
        element: result,
      })
    } catch (error) {
      console.error('Error updating element position: ', error)
      return response.internalServerError({
        message: 'Failed to update element position',
        error: error.message,
      })
    }
  }
  //
  //
  async upgradeElement({ params, response }: HttpContext) {
    try {
      // Find element to upgrade
      const elementToUpgrade = await Element.findOrFail(params.id)
      // Change it's type
      elementToUpgrade.type = 'tree'
      // Change it's objective value
      elementToUpgrade.objectiveValue = 0
      // Change Size
      elementToUpgrade.width = 200
      elementToUpgrade.height = 200
      // Save
      await elementToUpgrade.save()

      // Find Plan
      const planId = elementToUpgrade.planId
      // Recalculate objectives for this plan
      await ObjectiveService.recalculateForPlan(planId)
      // Get plan with new objectives values for the response
      const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()

      // Charger explicitement le vertex associé
      await elementToUpgrade.load('vertex')

      // Préparer une réponse avec toutes les données nécessaires
      const elementData = {
        id: elementToUpgrade.id,
        type: elementToUpgrade.type,
        width: elementToUpgrade.width,
        height: elementToUpgrade.height,
        vertexPositionX: elementToUpgrade.vertex.positionX,
        vertexPositionY: elementToUpgrade.vertex.positionY,
      }

      return response.status(200).json({
        objectives: plan.objectives.map((objective) => ({
          id: objective.id,
          name: objective.name,
          description: objective.description,
          target_value: objective.$extras.pivot_target_value,
          current_value: objective.$extras.pivot_current_value,
          completion_percentage: objective.$extras.pivot_completion_percentage,
          unit: objective.unit,
        })),
        element: elementData,
      })
    } catch (error) {
      console.error('Error upgrading element: ', error)
      return response.internalServerError({
        message: 'Failed to upgrade element',
        error: error.message,
      })
    }
  }
}
