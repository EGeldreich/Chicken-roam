import PlanEditor from '../modules/planEditor'
import setupPDFExport from '../pdfExport'

document.addEventListener('DOMContentLoaded', () => {
  const planId = window.PLAN_ID // set in template

  const planEditor = new PlanEditor(planId) // initialize planEditor

  setupPDFExport(planEditor) // initialize pdf export
})

document.querySelectorAll('*').forEach((el) => {
  const style = window.getComputedStyle(el)
  ;['color', 'backgroundColor', 'borderColor'].forEach((prop) => {
    if (style[prop]?.includes('oklch')) {
      console.log('Element with oklch:', el, prop, style[prop])
    }
  })
})
