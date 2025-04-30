import html2canvas from 'html2canvas'

// Exported function, called in plan.js
export default function setupPDFExport() {
  const exportButton = document.getElementById('exportPDF')

  if (!exportButton) return

  exportButton.addEventListener('click', () => exportPlanToPDF())
}

async function exportPlanToPDF() {
  try {
    // Get required DOM element
    const canvas = document.getElementById('planCanvas')

    // Hide temporary element while dealing with export
    // Get all elements
    const temporaryElements = Array.from(canvas.querySelectorAll('.temporary'))
    // Store them
    const temporaryVisibilityStates = temporaryElements.map((el) => {
      const currentDisplay = el.style.display // get current display
      el.style.display = 'none' // Hide element
      return currentDisplay || '' // Store original display value
    })

    // Security, to avoid exporting an empty plan
    // Find all relevant elements (fence, point and elements)
    const allElements = Array.from(
      canvas.querySelectorAll('.fence, .point, .element:not(.temporary)')
    )
    if (allElements.length === 0) {
      throw new Error('No elements found in the plan')
    }

    // Get the plan name, or settle for Chicken Realm
    const planName =
      document.querySelector('#plan-name')?.value ||
      document.querySelector('h1')?.textContent?.trim() ||
      'Chicken Realm'

    // Get correct size to export
    // Calculate bounding box of all elements
    const boundingBox = calculateBoundingBox(allElements)

    // Add padding
    const padding = 50 // in pixels
    boundingBox.left = Math.max(0, boundingBox.left - padding)
    boundingBox.top = Math.max(0, boundingBox.top - padding)
    boundingBox.right = Math.min(canvas.offsetWidth, boundingBox.right + padding)
    boundingBox.bottom = Math.min(canvas.offsetHeight, boundingBox.bottom + padding)

    // Calculate width and height
    const width = boundingBox.right - boundingBox.left
    const height = boundingBox.bottom - boundingBox.top

    // Set the clipping area to focus only on the elements
    const canvasClip = {
      x: boundingBox.left,
      y: boundingBox.top,
      width: width,
      height: height,
    }

    // Capture the canvas with html2canvas, with calculated clipping area
    const canvasCapture = await html2canvas(canvas, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      x: canvasClip.x,
      y: canvasClip.y,
      width: canvasClip.width,
      height: canvasClip.height,
    })

    // Convert canvas to Data URL
    const imageDataUrl = canvasCapture.toDataURL('image/png')

    // Open the pdf template in a new window (send plan name in the url)
    const templateUrl = `/pdf-template?planName=${encodeURIComponent(planName)}`
    const printWindow = window.open(templateUrl, '_blank', 'width=800,height=600')

    // throw an error if the new window did not open
    if (!printWindow) {
      throw new Error('Unable to open new window. Please allow popups for this site.')
    }

    // On the new page load
    printWindow.onload = function () {
      // Insert the image into the template container
      const canvasContainer = printWindow.document.getElementById('pdfCanvas')
      const img = new Image()
      img.src = imageDataUrl
      img.style.maxWidth = '100%'
      img.style.maxHeight = '100%'
      canvasContainer.appendChild(img)
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Failed to generate PDF: ' + error.message)
  } finally {
    // Restore visibility of temporary elements
    if (temporaryElements && temporaryVisibilityStates) {
      temporaryElements.forEach((el, index) => {
        el.style.display = temporaryVisibilityStates[index]
      })
    }
  }
}

/**
 * Calculate the bounding box containing all elements
 * @param {Array} elements - DOM elements to include in the bounding box
 * @returns {Object} - The bounding box coordinates
 */
function calculateBoundingBox(elements) {
  // Initialize with extreme values
  let boundingBox = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }

  // Find the bounding box containing all elements
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    const { scrollLeft, scrollTop } = document.documentElement

    // Get position relative to the canvas, accounting for scroll
    const canvasRect = document.getElementById('planCanvas').getBoundingClientRect()
    const elLeft = rect.left - canvasRect.left + scrollLeft
    const elTop = rect.top - canvasRect.top + scrollTop
    const elRight = elLeft + rect.width
    const elBottom = elTop + rect.height

    // Update bounding box
    boundingBox.left = Math.min(boundingBox.left, elLeft)
    boundingBox.top = Math.min(boundingBox.top, elTop)
    boundingBox.right = Math.max(boundingBox.right, elRight)
    boundingBox.bottom = Math.max(boundingBox.bottom, elBottom)
  })

  return boundingBox
}
