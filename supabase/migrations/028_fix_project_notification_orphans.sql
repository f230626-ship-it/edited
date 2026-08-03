-- 028: Harden project notification triggers against deleted employees,
-- and remove orphan project_resources that break status updates.

CREATE OR REPLACE FUNCTION handle_project_notifications()
RETURNS TRIGGER AS $$
DECLARE
  res_rec RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.manager_id IS NOT NULL AND EXISTS (SELECT 1 FROM employees WHERE id = NEW.manager_id) THEN
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.manager_id, 'project_created', 'New Project Created', 'Project ' || NEW.name || ' has been created and assigned to you as Project Manager.', 'project', NEW.id);
    END IF;
    IF NEW.bd_id IS NOT NULL AND EXISTS (SELECT 1 FROM employees WHERE id = NEW.bd_id) THEN
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.bd_id, 'project_created', 'New Project Created', 'Project ' || NEW.name || ' linked to your deal has been created.', 'project', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.manager_id IS NOT NULL AND EXISTS (SELECT 1 FROM employees WHERE id = NEW.manager_id) THEN
        INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
        VALUES (NEW.manager_id, 'project_status_changed', 'Project Status Updated', 'Project ' || NEW.name || ' status has been changed to ' || NEW.status || '.', 'project', NEW.id);
      END IF;
      IF NEW.bd_id IS NOT NULL AND EXISTS (SELECT 1 FROM employees WHERE id = NEW.bd_id) THEN
        INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
        VALUES (NEW.bd_id, 'project_status_changed', 'Project Status Updated', 'Project ' || NEW.name || ' status has been changed to ' || NEW.status || '.', 'project', NEW.id);
      END IF;
      -- Only notify resources that still exist as employees
      FOR res_rec IN
        SELECT pr.employee_id
        FROM project_resources pr
        INNER JOIN employees e ON e.id = pr.employee_id
        WHERE pr.project_id = NEW.id
      LOOP
        INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
        VALUES (res_rec.employee_id, 'project_status_changed', 'Project Status Updated', 'Project ' || NEW.name || ' status has been changed to ' || NEW.status || '.', 'project', NEW.id);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_resource_notifications()
RETURNS TRIGGER AS $$
DECLARE
  p_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM employees WHERE id = NEW.employee_id) THEN
      SELECT name INTO p_name FROM projects WHERE id = NEW.project_id;
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.employee_id, 'resource_assigned', 'Assigned to Project', 'You have been assigned to project ' || COALESCE(p_name, 'a project') || ' as ' || NEW.role || ' (' || NEW.allocation_percentage || '% allocation).', 'project', NEW.project_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM employees WHERE id = OLD.employee_id) THEN
      SELECT name INTO p_name FROM projects WHERE id = OLD.project_id;
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (OLD.employee_id, 'resource_unassigned', 'Removed from Project', 'You have been unassigned from project ' || COALESCE(p_name, 'a project') || '.', 'project', OLD.project_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop resource rows pointing at deleted employees (blocks status updates via old trigger)
DELETE FROM project_resources pr
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = pr.employee_id);
