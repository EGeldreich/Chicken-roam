// Get plan name from url (Url with plan name is created in pdfExport.js)
const urlParams = new URLSearchParams(window.location.search)
const planName = urlParams.get('planName') || 'Chicken Plan'

// Function to optimize image size for better display
function optimizeImageSize() {
  //Get img and container
  const img = document.querySelector('#pdfCanvas img')
  const container = document.querySelector('#pdfCanvas')

  // Get natural dimensions of the image
  const imgWidth = img.naturalWidth
  const imgHeight = img.naturalHeight
  const ratio = imgWidth / imgHeight

  // Check if image is landscape or portrait
  // Adapt style accordingly
  if (ratio > 1) {
    // Landscape image
    container.style.width = 'auto'
    container.style.height = '90%'
    container.style.aspectRatio = ratio
  } else {
    // Portrait image
    container.style.height = '80%'
    container.style.width = 'auto'
    container.style.aspectRatio = ratio
  }

  // Style the image to fit the container
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'contain'

  return { width: imgWidth, height: imgHeight, ratio }
}

// Call optimizeImageSize on load
document.querySelector('#pdfCanvas img')?.addEventListener('load', function () {
  optimizeImageSize()

  // Update page title with plan name
  document.title = `${planName} - PDF Export`
})

// Download pdf
document.getElementById('downloadPDF').addEventListener('click', function () {
  // Get the plan img
  const img = document.querySelector('#pdfCanvas img')
  // Get dimensions - these could also come from our optimizeImageSize function
  const imgWidth = img.naturalWidth
  const imgHeight = img.naturalHeight
  const ratio = imgWidth / imgHeight

  // Create a landscape or portrait pdf depending on the ratio
  let pdf
  if (ratio > 1) {
    pdf = new jspdf.jsPDF('landscape', 'mm', 'a4')
  } else {
    pdf = new jspdf.jsPDF('portrait', 'mm', 'a4')
  }

  // Get pdf dimensions
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  // Calculate the dimensions to adapt the img
  let finalWidth, finalHeight
  if (imgWidth / pdfWidth > imgHeight / pdfHeight) {
    finalWidth = pdfWidth
    finalHeight = imgHeight * (pdfWidth / imgWidth)
  } else {
    finalHeight = pdfHeight
    finalWidth = imgWidth * (pdfHeight / imgHeight)
  }

  // Center the image
  const x = (pdfWidth - finalWidth) / 2
  const y = (pdfHeight - finalHeight) / 2

  // Add the image and save
  pdf.addImage(img.src, 'PNG', x, y, finalWidth, finalHeight)
  pdf.save(`${planName}.pdf`)
})

// Function to print directly
document.getElementById('printPDF').addEventListener('click', function () {
  // First optimize the image display for printing
  // Get ratio from optimizeImageSize
  const { ratio } = optimizeImageSize()

  // Store current body class
  const originalBodyClass = document.body.className
  // Orient page according to ratio
  if (ratio > 1) {
    document.body.classList.add('landscape-print')
  } else {
    document.body.classList.add('portrait-print')
  }

  // Print the page
  window.print()

  // Restore original body class
  document.body.className = originalBodyClass
})
