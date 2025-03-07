import Element from '#models/element'
import Vertex from '#models/vertex'
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import ObjectiveService from '#services/objective_service'
import Plan from '#models/plan'

@inject()
export default class ElementsController {
  async create({ request, response }: HttpContext) {
    const trx = await db.transaction()

    try {
      // Get the data from the request
      const { planId, type, positionX, positionY, width, height, objectiveValue } = request.body()

      // Create vertex within transaction
      const vertex = await Vertex.create(
        {
          positionX,
          positionY,
          planId,
        },
        { client: trx }
      )

      // Create element within same transaction
      const element = await Element.create(
        {
          planId,
          type,
          vertexId: vertex.id,
          objectiveValue,
          width,
          height,
          description: '',
        },
        { client: trx }
      )

      // If both operations succeed, commit the transaction
      await trx.commit()

      // Load the vertex relationship
      await element.load('vertex')

      // Recalculate objectives for this plan
      await ObjectiveService.recalculateForPlan(planId)

      // Fetch the updated objectives
      const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()

      // Return both the element and the updated objectives
      return response.created({
        element,
        objectives: plan.objectives.map((objective) => ({
          id: objective.id,
          name: objective.name,
          description: objective.description,
          target_value: objective.$extras.pivot_target_value,
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
    const element = await Element.findOrFail(params.id)

    const planId = element.planId

    await element.delete()

    // Recalculate objectives for this plan
    await ObjectiveService.recalculateForPlan(planId)

    const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()

    return response.status(200).json({
      objectives: plan.objectives.map((objective) => ({
        id: objective.id,
        name: objective.name,
        description: objective.description,
        target_value: objective.$extras.pivot_target_value,
        completion_percentage: objective.$extras.pivot_completion_percentage,
        unit: objective.unit,
      })),
    })
  }
  //
  //
  async updatePosition({ params, response, request }: HttpContext) {
    const { positionX, positionY } = request.body()

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
        vertex.positionX = positionX
        vertex.positionY = positionY

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
  async upgradePerch({ params, response }: HttpContext) {
    try {
      // Find perch to upgrade
      const perch = await Element.findOrFail(params.id)
      // Change it's type
      perch.type = 'tree'
      // Save
      await perch.save()

      // Find Plan
      const planId = perch.planId
      // Recalculate objectives for this plan
      await ObjectiveService.recalculateForPlan(planId)

      const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()

      return response.status(200).json({
        objectives: plan.objectives.map((objective) => ({
          id: objective.id,
          name: objective.name,
          description: objective.description,
          target_value: objective.$extras.pivot_target_value,
          completion_percentage: objective.$extras.pivot_completion_percentage,
          unit: objective.unit,
        })),
      })
    } catch (error) {
      console.error('Error upgrading perch element: ', error)
      return response.internalServerError({
        message: 'Failed to upgrade perch element',
        error: error.message,
      })
    }
  }
}
