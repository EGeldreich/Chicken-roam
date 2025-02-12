import PlanEditor from '../modules/planEditor'

document.addEventListener('DOMContentLoaded', () => {
  const planId = window.PLAN_ID // set in template
  const editor = new PlanEditor(planId)
})
