import html2canvas from 'html2canvas'

// Exported function, called in plan.js
export default function setupPDFExport(planEditor) {
  const exportButton = document.getElementById('exportPDF')

  if (!exportButton) return

  exportButton.addEventListener('click', () => exportPlanToPDF(planEditor))
}

async function exportPlanToPDF(planEditor) {
  // Create a loading screen (full screen with text)
  // const loadingIndicator = document.createElement('div')
  // loadingIndicator.textContent = 'Preparing PDF...'
  // loadingIndicator.className =
  //   'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-green-main bg-opacity-50 text-white text-xl z-50'
  // document.body.appendChild(loadingIndicator)

  // Array to keep track of elements we've removed
  // Part of oklch handling, need a better solution
  const removedElements = []

  try {
    // Get required DOM elements
    const canvas = document.getElementById('planCanvas')
    const viewport = document.querySelector('.viewport-container')

    // Security
    if (!canvas || !viewport) {
      throw new Error('Canvas or viewport not found')
    }

    // Find all relevant elements (fence and elements)
    const allElements = Array.from(canvas.querySelectorAll('.fence, .element:not(.temporary)'))

    // Security, to avoid exporting an empty plan
    if (allElements.length === 0) {
      throw new Error('No elements found in the plan')
    }

    // Get the plan name, or settle for Chicken Realm
    const planName =
      document.querySelector('#plan-name')?.value ||
      document.querySelector('h1')?.textContent?.trim() ||
      'Chicken Realm'

    // Create a clone of the viewport for html2canvas
    // This way we don't modify the original DOM
    const viewportClone = viewport.cloneNode(true)
    viewportClone.style.position = 'absolute'
    viewportClone.style.left = '-9999px'
    viewportClone.style.visibility = 'hidden'
    document.body.appendChild(viewportClone)

    // Color handling part, need a better solution
    // Remove elements with oklch colors from the clone
    const allClonedElements = viewportClone.querySelectorAll('*')
    allClonedElements.forEach((el) => {
      try {
        // Remove problematic elements - all UI controls
        if (
          el.classList &&
          (el.classList.contains('point') ||
            el.classList.contains('temporary-point') ||
            el.classList.contains('temporary-element') ||
            el.classList.contains('tool-btn') ||
            el.id === 'elementMenu' ||
            el.classList.contains('guidance-message') ||
            el.classList.contains('tooltip-content') ||
            el.classList.contains('progress-bar') ||
            el.classList.contains('bg-blue-600') ||
            el.classList.contains('bg-green-500') ||
            el.classList.contains('bg-yellow-500') ||
            el.classList.contains('bg-orange-500') ||
            el.classList.contains('bg-red-500') ||
            el.classList.contains('bg-gray-200'))
        ) {
          if (el.parentNode) {
            el.parentNode.removeChild(el)
          }
        }
      } catch (e) {
        console.log('Error processing element', e)
      }
    })

    // Capture the clean clone with html2canvas
    const viewportCapture = await html2canvas(viewportClone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Remove the clone from the DOM
    document.body.removeChild(viewportClone)

    // Convert canvas to Data URL
    const imageDataUrl = viewportCapture.toDataURL('image/png')

    // Open the pdf template in a new window
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
    // Remove loading indicator
    if (loadingIndicator && loadingIndicator.parentElement) {
      document.body.removeChild(loadingIndicator)
    }
  }
}
