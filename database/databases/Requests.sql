-- PLAN OBJECTIVES CALCULATOR
SELECT
	p.name AS PlanName,
    o.name AS ObjectiveName,
    CEILING(p.nbChickens * 1.0/ o.perNbChicken) * o.goal AS toReach,
    o.unit
FROM objectives o
INNER JOIN plan_objectives po ON o.id_objective = po.id_objective
INNER JOIN plans p ON po.id_plan = p.id_plan
WHERE p.id_plan = 1;

-- PARTICULAR OBJECTIVE CALCULATOR
SELECT
    p.name AS PlanName,
    o.name AS ObjectiveName,
    CEILING(p.nbChickens * 1.0/ o.perNbChicken) * o.goal AS toReach,
    o.unit,
    SUM(CASE WHEN pe.type = 'shrubs' THEN pe.objectiveValue ELSE 0 END) AS CurrentValue
FROM plan p
INNER JOIN plan_objectives po ON p.id_plan = po.id_plan
INNER JOIN objective o ON po.id_objective = o.id_objective
INNER JOIN plan_element pe ON p.id_plan = pe.id_plan
WHERE p.id_plan = 1 AND o.name = 'shrubs'
