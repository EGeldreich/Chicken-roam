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
  const userMenuButton = document.getElementById('user-info-btn')
  const userDropdown = document.getElementById('dropdown-menu')

  // Display / hide on btn click
  userMenuButton.addEventListener('click', function () {
    userDropdown.classList.toggle('show')
  })

  // Close the menu if clicking outside
  window.addEventListener('click', function (event) {
    if (!event.target.matches('#user-info-btn') && !event.target.closest('#user-info-btn')) {
      if (userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show')
      }
    }
  })
})
