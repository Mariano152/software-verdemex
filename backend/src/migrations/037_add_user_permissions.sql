ALTER TABLE users
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE users
SET permissions = '["dashboard.view","analytics.view","vehicles.view","vehicles.create","vehicles.edit","vehicles.delete","vehicles.parameters","vehicles.maintenance","vehicles.photos","vehicles.documents","gasoline.view","gasoline.manage","inventory.view","inventory.manage","drivers.view","drivers.manage","drivers.rate","routes.view","routes.manage","users.manage"]'::jsonb
WHERE role = 'admin'
  AND (permissions IS NULL OR permissions = '[]'::jsonb);
