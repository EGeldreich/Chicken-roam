import Alpine from 'alpinejs'
import { initCookieConsent } from './cookie-consent'
import 'cookieconsent/build/cookieconsent.min.css'
import '../css/pages-css/custom-cookieconsent.css'

Alpine.start()

document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent()
})
