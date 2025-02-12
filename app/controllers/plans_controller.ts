import Plan from '#models/plan'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlansController {
  async plan({ params, view }: HttpContext) {
    const plan = await Plan.findOrFail(params.id)

    return view.render('pages/plan/plan', { plan })
  }
}
