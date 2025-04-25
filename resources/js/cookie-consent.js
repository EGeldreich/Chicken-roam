// resources/js/cookie-consent.js
import 'cookieconsent'

export function initCookieConsent() {
  window.cookieconsent.initialise({
    palette: {
      popup: {
        background: '#fff',
        text: '#471A03',
      },
      button: {
        background: '#f1781e',
        text: '#ffffff',
      },
    },
    theme: 'classic',
    position: 'bottom',
    type: 'info',
    // info because there is only essential cookies, type:opt-in otherwise
    content: {
      message: 'This website uses cookies to ensure you get the best experience.',
      dismiss: 'Got it',
      //   deny: 'Decline',
      //   allow: 'Accept',
      link: 'Learn more',
      href: '/cookies-policy',
      policy: 'Cookie Policy',
    },
    // Callbacks
    // onInitialise: function (status) {
    //   if (this.hasConsented()) {
    //     enableCookies()
    //   }
    // },
    // onStatusChange: function () {
    //   if (this.hasConsented()) {
    //     enableCookies()
    //   } else {
    //     disableCookies()
    //   }
    // },
    // onRevokeChoice: function () {
    //   disableCookies()
    // },
  })
}

// function enableCookies() {
//   // Activez ici vos scripts qui déposent des cookies
//   console.log('Cookies enabled')
//   // Par exemple, pour Google Analytics:
//   if (window.GOOGLE_ANALYTICS_ID) {
//     loadGoogleAnalytics(window.GOOGLE_ANALYTICS_ID)
//   }
// }

// function disableCookies() {
//   // Désactivez les cookies non essentiels
//   console.log('Cookies disabled')
//   // Par exemple, supprimez les cookies Google Analytics
//   document.cookie = '_ga=; Max-Age=-99999999; Path=/'
//   document.cookie = '_gat=; Max-Age=-99999999; Path=/'
//   document.cookie = '_gid=; Max-Age=-99999999; Path=/'
// }

// function loadGoogleAnalytics(id) {
//   // Code pour charger Google Analytics
//   const script = document.createElement('script')
//   script.async = true
//   script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
//   document.head.appendChild(script)

//   window.dataLayer = window.dataLayer || []
//   function gtag() {
//     dataLayer.push(arguments)
//   }
//   gtag('js', new Date())
//   gtag('config', id)
// }
