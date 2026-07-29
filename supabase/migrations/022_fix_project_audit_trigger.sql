-- Fix project audit trigger: migration 019 incorrectly used column "changes"
-- but project_audit_logs has "details".

CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO project_audit_logs (project_id, actor_id, action, details)
    VALUES (NEW.id, get_current_employee_id(), 'Created Project', jsonb_build_object(
      'name', NEW.name,
      'client_name', NEW.client_name,
      'status', NEW.status,
      'value', NEW.value,
      'priority', NEW.priority,
      'progress_percentage', NEW.progress_percentage,
      'source', NEW.source
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'Archived' AND get_current_employee_pm_role() != 'admin' THEN
      RAISE EXCEPTION 'Only Administrators can archive projects';
    END IF;

    IF OLD.name != NEW.name THEN changes := changes || jsonb_build_object('name', jsonb_build_array(OLD.name, NEW.name)); END IF;
    IF OLD.client_name != NEW.client_name THEN changes := changes || jsonb_build_object('client_name', jsonb_build_array(OLD.client_name, NEW.client_name)); END IF;
    IF OLD.status != NEW.status THEN changes := changes || jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status)); END IF;
    IF OLD.value != NEW.value THEN changes := changes || jsonb_build_object('value', jsonb_build_array(OLD.value, NEW.value)); END IF;
    IF OLD.expected_delivery_date != NEW.expected_delivery_date THEN changes := changes || jsonb_build_object('expected_delivery_date', jsonb_build_array(OLD.expected_delivery_date, NEW.expected_delivery_date)); END IF;
    IF OLD.manager_id IS DISTINCT FROM NEW.manager_id THEN changes := changes || jsonb_build_object('manager_id', jsonb_build_array(OLD.manager_id, NEW.manager_id)); END IF;
    IF OLD.bd_id IS DISTINCT FROM NEW.bd_id THEN changes := changes || jsonb_build_object('bd_id', jsonb_build_array(OLD.bd_id, NEW.bd_id)); END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      changes := changes || jsonb_build_object('priority', jsonb_build_array(OLD.priority, NEW.priority));
    END IF;
    IF OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
      changes := changes || jsonb_build_object('progress_percentage', jsonb_build_array(OLD.progress_percentage, NEW.progress_percentage));
    END IF;
    IF OLD.project_type IS DISTINCT FROM NEW.project_type THEN
      changes := changes || jsonb_build_object('project_type', jsonb_build_array(OLD.project_type, NEW.project_type));
    END IF;
    IF OLD.source IS DISTINCT FROM NEW.source THEN
      changes := changes || jsonb_build_object('source', jsonb_build_array(OLD.source, NEW.source));
    END IF;

    IF changes != '{}'::jsonb THEN
      INSERT INTO project_audit_logs (project_id, actor_id, action, details)
      VALUES (NEW.id, get_current_employee_id(), 'Updated Project', changes);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
