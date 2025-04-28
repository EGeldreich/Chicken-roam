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
        text: '#fff',
      },
    },
    theme: 'classic',
    position: 'bottom',
    type: 'opt-in',
    revokable: false,
    content: {
      message: 'This website uses essential cookies and optional "remember me" functionality.',
      deny: 'Essential cookies only',
      allow: 'Accept all',
      link: 'Learn more',
      href: '/cookies-policy',
      policy: 'Cookie Policy',
    },
    // Callbacks
    onInitialise: function (status) {
      const type = this.options.type
      const didConsent = this.hasConsented()

      if (type == 'opt-in' && didConsent) {
        // Consent given, enable remember me
        enableRememberMeCookie()
      }
    },
    onStatusChange: function (status, chosenBefore) {
      const type = this.options.type
      const didConsent = this.hasConsented()

      if (type == 'opt-in' && didConsent) {
        enableRememberMeCookie()
      } else {
        disableRememberMeCookie()
      }
    },
    onRevokeChoice: function () {
      // Consent not given, disable
      disableRememberMeCookie()
    },
  })
}

// Local storage is used with Alpine on login.edge to check cookie status

// Send info to allow cookie
function enableRememberMeCookie() {
  console.log('Remember Me cookie enabled')
  localStorage.setItem('remember_me_allowed', 'true')

  // Custom event to be catched
  document.dispatchEvent(
    new CustomEvent('remember_me_status_change', {
      detail: { allowed: true },
    })
  )
}

// Send info to disable cookie
function disableRememberMeCookie() {
  console.log('Remember Me cookie disabled')
  localStorage.setItem('remember_me_allowed', 'false')

  // Delete any existing remember-me cookie
  document.cookie = 'remember_me=; Max-Age=-99999999; Path=/'

  // Custom event to be catched
  document.dispatchEvent(
    new CustomEvent('remember_me_status_change', {
      detail: { allowed: false },
    })
  )
}
