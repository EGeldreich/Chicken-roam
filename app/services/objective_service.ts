import Plan from '#models/plan'

export default class ObjectiveService {
  // static function that will be called when an element is added to the db
  // used to calculate completion percentage
  static async recalculateForPlan(planId: number) {
    // Safety check
    // If for some reason there is no planId, get out
    if (!planId) return

    // Load the plan, with it's objectives and elements
    const plan = await Plan.query()
      .where('id', planId)
      .preload('objectives')
      .preload('elements')
      .firstOrFail() // Safety measure (throw exception if no plan is found)

    // Get all elements
    const elements = plan.elements

    // For each objective, caculate percentage
    for (const objective of plan.objectives) {
      // Get pivot data ($extras.pivot_ is necessary to access pivot column data)
      // Checking if target value exists
      // If it does, create object with (targetValue: nb) and (completionPercentage: nb)
      const pivotData = objective.$extras.pivot_target_value
        ? {
            targetValue: objective.$extras.pivot_target_value,
            completionPercentage: objective.$extras.pivot_completion_percentage,
          }
        : null // If no target value, set as null

      if (!pivotData) continue
      // Go to the next loop if there is no pivot data (shouldn't happen)

      // Filter all elements
      // Check for correspondance between current loop objective and elements
      const relevantElements = elements.filter((element) => {
        // Only keep wanted elements for each loop
        if (objective.name === 'area' && element.type === 'area') return true
        if (objective.name === 'shrubs' && element.type === 'shrub') return true
        if (objective.name === 'shelter' && element.type === 'shelter') return true
        if (objective.name === 'perch' && element.type === 'perch') return true
        if (objective.name === 'insectary' && element.type === 'insectary') return true
        if (objective.name === 'dustbath' && element.type === 'dustbath') return true
        if (objective.name === 'waterer' && element.type === 'waterer') return true
        return false
      })

      // Calculate current loop objective elements contribution
      // adds up each element objectiveValue
      const currentValue = relevantElements.reduce(
        (sum, element) => sum + element.objectiveValue,
        0
      )

      // Calculate percentage (capped at 100%)
      const percentage = Math.min(Math.round((currentValue / pivotData.targetValue) * 100), 100)

      // Update the pivot data
      await plan
        .related('objectives')
        .pivotQuery()
        .where('plan_id', planId)
        .where('objective_id', objective.id)
        .update({ completion_percentage: percentage })
    }
  }
}
