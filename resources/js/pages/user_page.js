// On load, set --percentage property as percentage from data-attribute
document.addEventListener('DOMContentLoaded', () => {
  const progressBars = document.querySelectorAll('.circular-progress-bar')

  progressBars.forEach((bar) => {
    const percentage = bar.getAttribute('data-percentage')
    bar.style.setProperty('--percentage', `${percentage}%`)
  })
})

// Dropdown menu logic
document.addEventListener('DOMContentLoaded', function () {
  // Get elements
  const dropdownButton = document.getElementById('user-info-btn')
  const dropdownMenu = document.getElementById('dropdown-menu')

  // Force hide on load (security)
  dropdownMenu.style.display = 'none'

  // Toggle menu on btn click
  dropdownButton.addEventListener('click', function (e) {
    e.stopPropagation()
    const currentDisplay = window.getComputedStyle(dropdownMenu).display
    dropdownMenu.style.display = currentDisplay === 'none' ? 'block' : 'none'
  })

  // Close when clicking outside of the menu
  window.addEventListener('click', function (e) {
    if (!e.target.closest('#user-info-btn') && !e.target.closest('#dropdown-menu')) {
      dropdownMenu.style.display = 'none'
    }
  })

  // Avoid closing the menu when clicking on the form
  const deleteForm = dropdownMenu.querySelector('form')
  if (deleteForm) {
    deleteForm.addEventListener('click', function (e) {
      e.stopPropagation()
    })
  }
})
