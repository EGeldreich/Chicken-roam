import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  homePage({ view }: HttpContext) {
    return view.render('pages/home')
  }
}
