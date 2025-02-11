import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  //
  //
  // Render user page view
  userPage({ view }: HttpContext) {
    return view.render('pages/user/user_page')
  }
  //
  //
  // Edit user info
}
