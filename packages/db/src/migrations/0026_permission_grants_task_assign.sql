INSERT INTO principal_permission_grants (company_id, principal_type, principal_id, permission_key)
SELECT a.company_id, 'agent', a.id::text, 'tasks:assign'
FROM agents a
WHERE a.role = 'ceo'
ON CONFLICT DO NOTHING;
