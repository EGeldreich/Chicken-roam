export default class FenceDrawer {
  constructor(canvas, planId, planEditor) {
    // Get basic properties
    this.canvas = canvas // Defined in PlanEditor, drawing area HTML element
    this.planId = planId // Defined in PlanEditor, used to push elements
    this.planEditor = planEditor // Reference planEditor for useful methods

    this.vertices = new Map() // Initialize Map() so we can store coordinates and number of fences linked
    // (123, {x: 100, y: 200, connections: 2})  // id => {x, y, connections}
    this.connectionPoints = [] // Initialize empty array for connection points
    this.movablePoints = [] // Initialize empty array for movable points
    this.enclosureSnapDistance = 50 / this.planEditor.zoom // Distance in pixels to snap to first vertex
    this.EPSILON = 1 // Margin of error value
    this.MIN_ANGLE_DEG = 15 // Minimum angle between 2 consecutive fences

    // Set default states
    this.temporaryFence = null // used to show fences that are being drawn but not confirmed yet
    this.drawStartPoint = null // used to calculate length and angle of fences and calculate vertex coords
    this.isDrawing = false // State required to not triggers mouse events constantly
    this.isFirstFence = true // Needed to be able to draw first fence without any connection point

    this.lengthIndicator = null // Will indicate fence length while drawing

    this.loadExistingFences() // Get existings fences from DB

    // Listen for fence deletions
    this.canvas.addEventListener('fenceDeleted', (event) => {
      this.loadExistingFences()
    })
    // Listen for vertex movements
    this.canvas.addEventListener('vertexMoved', (event) => {
      this.loadExistingFences()
    })
  }

  /**
   * Get existing fences and update ConnectionPoints
   * calls updateConnectionPoints()
   */
  async loadExistingFences() {
    // GET fences from db
    const response = await fetch(`/api/fences/${this.planId}`)
    if (response.ok) {
      const fences = await response.json()

      // Set isFirstFence to false if there is at least 1 fence
      this.isFirstFence = fences.length === 0

      // Clear existing vertices
      this.vertices.clear()

      // Remove all existing fence elements from the DOM
      const existingFences = this.canvas.querySelectorAll('.fence')
      existingFences.forEach((fence) => fence.remove())

      // For each fence
      fences.forEach((fence) => {
        // Create Fence HTML element
        this.renderFence(fence)
        // Track existing vertices
        this.trackVertex(fence.vertexStart)
        this.trackVertex(fence.vertexEnd)
      })

      this.updatePoints()
    }
  }

  /**
   * Fills up vertices Map() with (key,connections) in the form of ('100,200', 2)
   * Where '100' is X coords, '200' is Y coords, and '2' is the number of fences using that vertex
   * @param {Object} vertex Vertex Object {id: 126, positionX: '326.00', positionY: '530.00', planId: 9}
   */
  trackVertex(vertex) {
    // Normalize coordinates to integers
    const x = Math.round(parseFloat(vertex.positionX))
    const y = Math.round(parseFloat(vertex.positionY))
    // Get Vertex id
    const id = vertex.id
    // If the vertex is already in the map
    if (this.vertices.has(id)) {
      // Increment connection
      const vertexData = this.vertices.get(id)
      vertexData.connections += 1
    } else {
      // If not, create new one
      this.vertices.set(id, {
        x,
        y,
        connections: 1,
      })
    }
  }

  /**
   * Update the connections and movable points availability and number of connections
   * Connection points are used as starting point for any fence that isn't the first, and as closure point
   * Movable points are used to move fences
   * Calls addConnectionPoints() and addMovablePoints() to render them
   */
  updatePoints() {
    // Remove connection points from html (point is an HTML element because that's what is pushed in the array)
    this.connectionPoints.forEach((point) => point.remove())
    this.movablePoints.forEach((point) => point.remove())
    // Set connectionPoints as empty array
    this.connectionPoints = []
    this.movablePoints = []
    // Check each vertex from the vertices Map()
    this.vertices.forEach((vertexData, id) => {
      // Get x and Y coords
      const { x, y, connections } = vertexData

      // Add point depending on connections
      this.addPoint(x, y, connections, id)
    })
  }

  /**
   * Create points HTML elements and style them
   * Called in updatePoints()
   * @param {Number} x X coordinate of connection point
   * @param {Number} y Y coordinate of connection point
   * @param {Number} connections number of connected fences to the point
   * @param {Number} id vertex id in DB
   */
  addPoint(x, y, connections, id) {
    // Create div element
    const point = document.createElement('div')
    // Add data attribute
    point.dataset.vertexId = id
    // Set it's position
    point.style.left = `${x}px`
    point.style.top = `${y}px`
    // Give it correct class, and push into correct array
    if (connections < 2) {
      point.className = 'point connection-point selectable'
      this.connectionPoints.push(point)
    } else {
      point.className = 'point movable-point selectable'
      this.movablePoints.push(point)
    }
    // Append to canvas
    this.canvas.appendChild(point)
  }

  /**
   * Seek out nearest connection point to snap to it
   * If the connection point is closer than set snapDistance, automatically snap to it
   * @param {Object} point Object containing mouse coordinates {x, y}
   * @returns {Object} nearest, {x, y} coordinates of nearest connection point
   */
  findNearestConnectionPoint(point) {
    // Set up a snap distance
    const snapDistance = 50 // pixels
    // Set nearest as null
    let nearest = null
    // Define minDistance as snapDistance
    let minDistance = snapDistance

    // For each vertex
    this.vertices.forEach((vertexData, id) => {
      const { x, y, connections } = vertexData
      // If there is less than 2 connections
      if (connections < 2) {
        // Calculate distance to vertex
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))

        // If the distance is lower than the minDistance
        if (distance < minDistance) {
          // Set minDistance = distance, so for the remaining loops only vertex even closer will go in here
          minDistance = distance
          // Set nearest coordinates
          nearest = { x, y }
        }
      }
    })
    // Return coordinates of nearest connection point
    return nearest
  }

  /**
   * Handle mouse down event, mostly check conditions
   * Get point coordinates from PlanEditor
   * Calls startDrawing() and findNearestConnectionPoint()
   * @param {Object} point Object containing mouse coordinates {x, y}
   */
  handleMouseDown(point) {
    // If no fence has been placed yet
    if (this.isFirstFence) {
      // Call startDrawing function at mouse point
      this.startDrawing(point)
      // If there is already at least one fence
    } else {
      // Seek nearest connection point via findNearestConnectionPoint method
      const nearestPoint = this.findNearestConnectionPoint(point)
      // If there is a connection point close enough
      if (nearestPoint) {
        // Call startDrawing function at connection point
        this.startDrawing(nearestPoint)
      }
    }
  }

  /**
   * Handle drawing state and creation of temporary fences HTML elements
   * @param {Object} point Object containing mouse coordinates or nearest connection point {x, y}
   */
  startDrawing(point) {
    // Set isDrawing state to true
    this.isDrawing = true
    // Set drawing start point to mouse point or nearest connection point
    this.drawStartPoint = point

    // Create a new element to show the fence line
    this.temporaryFence = document.createElement('div')
    // Add classes
    this.temporaryFence.className = 'absolute h-1 bg-black transform origin-left'
    // Handle placement via coordinates
    this.temporaryFence.style.left = `${point.x}px`
    this.temporaryFence.style.top = `${point.y}px`
    // Append a temporary fence to canva
    this.canvas.appendChild(this.temporaryFence)

    // Create length indicator
    this.lengthIndicator = document.createElement('div')
    // Add styling classes
    this.lengthIndicator.className =
      'fence-length-indicator absolute bg-white border border-gray-500 px-2 py-1 rounded-md text-sm z-50'
    // Append to canvas
    this.canvas.appendChild(this.lengthIndicator)
  }

  /**
   * Remove temporary element and reset to default states
   */
  stopPlacement() {
    if (this.temporaryFence) {
      this.temporaryFence.remove()
    }

    if (this.lengthIndicator) {
      this.lengthIndicator.remove()
      this.lengthIndicator = null
    }

    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }

  /**
   * Handle temporary fence movement and styling
   * Constantly seek nearestPoint for potential snap
   * @param {Object} point Object containing mouse coordinates {x, y}, given by PlanEditor
   */
  handleMouseMove(point) {
    // If we are not currently drawing, do nothing
    if (!this.isDrawing) return
    // Constantly seek nearest connection point
    const nearestPoint = this.findNearestConnectionPoint(point)
    // Define current endpoint of the temporary fence as mouse coordinates
    let endPoint = point

    // If a connection point is found
    if (nearestPoint) {
      // Snap to it
      endPoint = nearestPoint
      // Add styling class
      this.temporaryFence.classList.add('snapping-to-connection')
    } else {
      // Remove styling class if far enough
      this.temporaryFence.classList.remove('snapping-to-connection')
    }

    // Check validity
    const isInvalid = this.checkFenceValidity(
      this.drawStartPoint.x,
      this.drawStartPoint.y,
      endPoint.x,
      endPoint.y
    ).invalid
    // Update visual feedback
    if (isInvalid) {
      this.temporaryFence.classList.add('invalid-placement')
      this.temporaryFence.classList.remove('valid-placement')
    } else {
      this.temporaryFence.classList.add('valid-placement')
      this.temporaryFence.classList.remove('invalid-placement')
    }

    // Calculate the length and angle of the fence line
    // Get difference between startPoint and current endPoint on X and Y coordinates
    const deltaX = endPoint.x - this.drawStartPoint.x
    const deltaY = endPoint.y - this.drawStartPoint.y
    // Calculate length (Pythagore a²= b² + c² )
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    // Calculate angle
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    // atan2 returns radians, * (180 / Math.PI) transforms it into regular degrees

    // Update the temporary fence line according to length and angle
    this.temporaryFence.style.width = `${length}px`
    this.temporaryFence.style.transform = `rotate(${angle}deg)`

    // Update length indicator
    if (this.lengthIndicator) {
      // Transform pixel into meters (take zoom into account)
      const lengthInMeters = length / 100 / this.planEditor.zoom

      // Place indicator next to the mouse
      const indicatorX = endPoint.x + 15
      const indicatorY = endPoint.y - 15
      this.lengthIndicator.style.left = `${indicatorX}px`
      this.lengthIndicator.style.top = `${indicatorY}px`

      // Display length with 2 decimals
      this.lengthIndicator.textContent = `${lengthInMeters.toFixed(2)} m`

      // Add color to text according to the fence validity
      if (isInvalid) {
        this.lengthIndicator.classList.add('text-red-500')
        this.lengthIndicator.classList.remove('text-green-500')
      } else {
        this.lengthIndicator.classList.add('text-green-500')
        this.lengthIndicator.classList.remove('text-red-500')
      }
    }
  }

  /**
   * Handle creation of the fence, or error handling if placement is not possible
   * POST request to create fence
   * Calls enclosure completions methods if necessary
   * @param {Object} point Object containing mouse coordinates or nearest connection point {x, y}
   * @throws {Error} Issue occuring during fence saving in Database
   */
  async handleMouseUp(point) {
    // If not currently drawing, do nothing
    if (!this.isDrawing) return

    // Remove length indicator on mouse release
    if (this.lengthIndicator) {
      this.lengthIndicator.remove()
      this.lengthIndicator = null
    }

    // Define default endpoint as current mouse position
    let endPoint = point

    // Seek near enough connection point
    const nearestPoint = this.findNearestConnectionPoint(point)
    // If we're near a connection point
    if (nearestPoint) {
      // overwrite default endpoint with connection point
      endPoint = nearestPoint
    }

    // If we are far enough from the starting point
    if (this.drawStartPoint.x !== endPoint.x || this.drawStartPoint.y !== endPoint.y) {
      // Check for placement validity using helper method
      const checkResult = this.checkFenceValidity(
        this.drawStartPoint.x,
        this.drawStartPoint.y,
        endPoint.x,
        endPoint.y
      )

      // If the placement is invalid
      if (checkResult.invalid) {
        // Define error message
        let message
        if (checkResult.reason === 'angle') {
          message = `Angle between two fences should be at least ${this.MIN_ANGLE_DEG}°.`
        } else {
          message = 'Fences cannot intersect.'
        }

        // Use planEditor method
        this.planEditor.showGuidanceMessage(message, true)

        // Add error class to temporary fence
        this.temporaryFence.classList.add('invalid-placement')
        setTimeout(() => {
          this.temporaryFence.remove()
        }, 500)

        return
      }
      try {
        // Redirect to FenceController 'create'
        const response = await fetch('/api/fences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
          body: JSON.stringify({
            planId: this.planId,
            startX: this.drawStartPoint.x,
            startY: this.drawStartPoint.y,
            endX: endPoint.x,
            endY: endPoint.y,
          }),
        })

        // Get response data for error handling
        const responseData = await response.json()

        // If everything went alright in the FenceController
        if (response.ok) {
          // Set isFirstFence to false
          this.isFirstFence = false
          // Handle newly created fence's vertices
          this.trackVertex(responseData.vertexStart)
          this.trackVertex(responseData.vertexEnd)
          // Upodate points
          this.updatePoints()
          // Transform classes to permanent ones
          this.temporaryFence.className = 'fence selectable'
          // Add a dataset id
          this.temporaryFence.dataset.fenceId = responseData.id
          this.temporaryFence.dataset.vertexStartId = responseData.vertexStart.id
          this.temporaryFence.dataset.vertexEndId = responseData.vertexEnd.id

          // Use hasFormedEnclosure to check if the enclosure is now closed
          if (this.hasFormedEnclosure()) {
            // Handle enclosure
            this.handleEnclosureComplete()
          }
          // Error handling
        } else {
          console.error('Server error:', responseData)
          this.temporaryFence.remove()
        }
      } catch (error) {
        console.error('Failed to save fence:', error)
        this.temporaryFence.remove()
      }
    } else {
      // Remove temporary fence if not long enough
      this.temporaryFence.remove()
    }

    // Reinitialize states
    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }

  /**
   * Render fences on load, called in loadingExistingFences()
   * @param {Object} fenceData {type, planId, vertexStartId, vertexEndId}
   */
  renderFence(fenceData) {
    // Create a fence HTML element
    const fenceElement = document.createElement('div')
    // Add classes and dataset
    if (fenceData.type === 'standard') {
      fenceElement.className = 'fence selectable'
    } else {
      fenceElement.className = 'fence door selectable'
    }
    fenceElement.dataset.fenceId = fenceData.id
    fenceElement.dataset.vertexStartId = fenceData.vertexStartId
    fenceElement.dataset.vertexEndId = fenceData.vertexEndId

    // Get start and end positions from the fence data
    const startX = parseFloat(fenceData.vertexStart.positionX)
    const startY = parseFloat(fenceData.vertexStart.positionY)
    const endX = parseFloat(fenceData.vertexEnd.positionX)
    const endY = parseFloat(fenceData.vertexEnd.positionY)

    // Calculate length and angle
    const deltaX = endX - startX
    const deltaY = endY - startY
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Apply styles
    fenceElement.style.left = `${startX}px`
    fenceElement.style.top = `${startY}px`
    fenceElement.style.width = `${length}px`
    fenceElement.style.transform = `rotate(${angle}deg)`

    // Add to canvas
    this.canvas.appendChild(fenceElement)
  }

  /**
   * Used to check enclosure when adding a fence, called in handleMouseUp()
   * Calls enslosureService method
   * @returns {Boolean} True if enclosure is complete
   */
  hasFormedEnclosure() {
    return this.planEditor.commonFunctionsService.isEnclosureComplete(this.vertices)
  }

  /**
   * Call back-end response to handle enclosure completion
   * Handle elements to update or remove if enclosure was previously broken
   * @throws {Error} Server-side error on modifying plan state or element deletion
   */
  async handleEnclosureComplete() {
    // Calculate the area
    const enclosedArea = this.planEditor.commonFunctionsService.calculateEnclosedArea()

    // Before sending to the backend, check existing elements if plan was previously broken
    const wasInBrokenState = this.planEditor.planState === 'broken'

    // If the plan was previously broken, categorize existing elements
    let elementsToUpdate = []
    let elementsToRemove = []

    if (wasInBrokenState) {
      // Use the categorizeElements method from PlanEditor
      const { inside, outside } = this.planEditor.categorizeElements()

      // Elements inside the new enclosure should be reactivated
      elementsToUpdate = inside.map((el) => el.id)

      // Elements outside the new enclosure should be removed
      elementsToRemove = outside.map((el) => el.id)

      // Mark elements for visual update
      outside.forEach((el) => {
        const domElement = document.querySelector(`[data-element-id="${el.id}"]`)
        if (domElement) {
          domElement.classList.add('outside-enclosure')
        }
      })

      // Ask user for confirmation before removing elements
      if (elementsToRemove.length > 0) {
        const confirmRemoval = confirm(
          `${elementsToRemove.length} elements are now outside the enclosure and will be removed. Continue?`
        )

        if (!confirmRemoval) {
          // User canceled - clear visual markings
          document.querySelectorAll('.outside-enclosure').forEach((el) => {
            el.classList.remove('outside-enclosure')
          })
          return // Don't complete the enclosure
        }
      }
    }

    // Update DB to set Plan as 'isEnclosed' and handle elements
    try {
      const response = await fetch(`/api/plans/${this.planId}/complete-enclosure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          area: enclosedArea,
          elementsToUpdate, // Elements to reactivate
          elementsToRemove, // Elements to remove
        }),
      })

      // Once the plan is set as enclosed
      if (response.ok) {
        const responseData = await response.json()
        const areaCompletion = responseData.areaCompletion
        const newState = responseData.newState || 'enclosed'

        // Add visual feedback
        this.canvas.classList.add('enclosure-complete')

        // Update the plan state in the editor
        this.planEditor.updatePlanState(newState)

        // If elements were removed, remove them from the DOM and tracking array
        if (elementsToRemove.length > 0) {
          elementsToRemove.forEach((id) => {
            const element = document.querySelector(`[data-element-id="${id}"]`)
            if (element) element.remove()
          })

          // Update the placedElements array
          this.planEditor.placedElements = this.planEditor.placedElements.filter(
            (el) => !elementsToRemove.includes(el.id)
          )
        }

        // Personnalized event
        // Create ability to listen for an 'enclosureComplete' event on other files
        const event = new CustomEvent('enclosureComplete', {
          detail: {
            planId: this.planId,
            area: enclosedArea,
            elementsRemoved: elementsToRemove.length,
          },
        })
        // Dispatch the event from the canvas element
        this.canvas.dispatchEvent(event)

        // Update objective completion with new value
        this.planEditor.objectivesManager.updateObjectiveCompletion('area', areaCompletion)

        // Call update total completion
        this.planEditor.objectivesManager.updateTotalCompletion()

        // If elements were removed or updated, show a message
        if (elementsToRemove.length > 0 || elementsToUpdate.length > 0) {
          const message = `Enclosure complete! ${elementsToUpdate.length} elements reactivated, ${elementsToRemove.length} elements removed.`
          this.planEditor.showGuidanceMessage(message)
        }
      }
    } catch (error) {
      console.error('Failed to complete enclosure:', error)
    }
  }

  /**
   * Method to calculate angle between 2 fences. Used to avoid superposition
   * @param {Object} line1Start {x, y} start coordinates of first line
   * @param {Object} line1End {x, y} end coordinates of first line
   * @param {Object} line2Start {x, y} start coordinates of second line
   * @param {Object} line2End {x, y} end coordinates of second line
   * @returns {Number} angle in degrees between 2 inputed lines
   */
  calculateAngleBetweenLines(line1Start, line1End, line2Start, line2End) {
    // Line verctors
    const vector1 = {
      x: line1End.x - line1Start.x,
      y: line1End.y - line1Start.y,
    }
    const vector2 = {
      x: line2End.x - line2Start.x,
      y: line2End.y - line2Start.y,
    }

    // Scalare product / Dot product
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y

    // Vectors length
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y)
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y)

    // Security to avoir dividing by 0
    if (magnitude1 < this.EPSILON || magnitude2 < this.EPSILON) {
      return 0 // length too small
    }

    // Angle cosinus
    const cosAngle = dotProduct / (magnitude1 * magnitude2)
    // Radial angle
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
    // Convert to degrees
    let angleDeg = angleRad * (180 / Math.PI)

    return 180 - angleDeg
  }

  /**
   * Check placement validity of fence being drawn
   * Need a correct angle and no intersection
   * @param {Number} startX Starting point X coordinate
   * @param {Number} startY Starting point Y coordinate
   * @param {Number} endX Ending point X coordinate
   * @param {Number} endY Ending point Y coordinate
   * @returns {Object} result {invalid: Boolean, reason: String}
   */
  checkFenceValidity(startX, startY, endX, endY) {
    // Get all fences
    const fences = Array.from(this.canvas.querySelectorAll('.fence'))

    const newStart = { x: startX, y: startY } // Start point of new fence
    const newEnd = { x: endX, y: endY } // End point of new fence

    const result = { invalid: false, reason: null } // Default result

    // First, check angle
    // For each fence ...
    for (const fence of fences) {
      const endpoints = this.planEditor.commonFunctionsService.getFenceEndpoints(fence) // Get endpoints
      // Check if the new fence start point is used by another fence
      // (Should always be the case except for the first fence)
      const sharesStartPoint =
        this.planEditor.commonFunctionsService.arePointsClose(newStart, endpoints.start) ||
        this.planEditor.commonFunctionsService.arePointsClose(newStart, endpoints.end)

      // Check if the new fence end point is used by another fence
      // (Should be the case only on fence closure, or if a fence has been deleted)
      const sharesEndPoint =
        this.planEditor.commonFunctionsService.arePointsClose(newEnd, endpoints.start) ||
        this.planEditor.commonFunctionsService.arePointsClose(newEnd, endpoints.end)

      // If there is a shared point
      if (sharesStartPoint || sharesEndPoint) {
        // Calculate angle
        const angle = this.calculateAngleBetweenLines(
          newStart,
          newEnd,
          endpoints.start,
          endpoints.end
        )

        // Check angle validity
        if (angle < this.MIN_ANGLE_DEG) {
          result.invalid = true
          result.reason = 'angle'
          return result
        }
      }
    }

    // Secondly, check for intersections
    // For each fence ...
    for (const fence of fences) {
      const endpoints = this.planEditor.commonFunctionsService.getFenceEndpoints(fence) // Get endpoints

      // Check if we share an endpoint
      const sharesEndpoint =
        this.planEditor.commonFunctionsService.arePointsClose(newStart, endpoints.start) ||
        this.planEditor.commonFunctionsService.arePointsClose(newStart, endpoints.end) ||
        this.planEditor.commonFunctionsService.arePointsClose(newEnd, endpoints.start) ||
        this.planEditor.commonFunctionsService.arePointsClose(newEnd, endpoints.end)

      // If an endpoint is shared, intersection is tolerated
      if (sharesEndpoint) {
        continue
      }

      // Check intersections on non-linked fences
      if (
        this.planEditor.commonFunctionsService.checkLineIntersection(
          startX,
          startY,
          endX,
          endY,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        )
      ) {
        // Update result accordingly
        result.invalid = true
        result.reason = 'intersection'
        return result
      }
    }

    return result // Valid placement
  }
}
