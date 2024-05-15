MATCH p=shortestPath((start:User { id:$uid1 })-[:PARENT_OF|CHILD_OF|PARTNER_OF*]-(end:User {id:$uid2}))
UNWIND nodes(p) AS n
WITH p, collect(n) AS pathNodes, start, end
UNWIND relationships(p) AS r
WITH r, startNode(r) AS rStart, endNode(r) AS rEnd, pathNodes, start, p
WITH r, rStart, rEnd, p,
REDUCE(s = [], i IN RANGE(0, size(pathNodes)-2) |
s +
CASE
 WHEN pathNodes[i] = rStart AND pathNodes[i+1] = rEnd THEN ['FORWARD']
 WHEN pathNodes[i] = rEnd AND pathNodes[i+1] = rStart THEN ['BACKWARD']
ELSE []
END) AS directions
RETURN collect(

CASE
 WHEN 'FORWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'CHILD_OF'
 WHEN 'BACKWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'PARENT_OF'
 WHEN 'FORWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'PARENT_OF'
 WHEN 'BACKWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'CHILD_OF'
 WHEN type(r) = 'PARTNER_OF' THEN 'PARTNER_OF'
ELSE 'UNDEFINED'
END
) AS relationshipTypes,
apoc.text.join(collect(

CASE
 WHEN 'FORWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'CHILD_OF'
 WHEN 'BACKWARD' IN directions AND type(r) = 'PARENT_OF' THEN 'PARENT_OF'
 WHEN 'FORWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'PARENT_OF'
 WHEN 'BACKWARD' IN directions AND type(r) = 'CHILD_OF' THEN 'CHILD_OF'
 WHEN type(r) = 'PARTNER_OF' THEN 'PARTNER_OF'
ELSE 'UNDEFINED'
END
), " ") AS pathDescription
