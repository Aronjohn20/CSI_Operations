-- ============================================
-- CSI Operations - Auto-update coordinator count
-- Run this FIFTH
-- ============================================
-- This trigger automatically updates events_coordinated_count
-- on the members table whenever you assign/unassign a coordinator

CREATE OR REPLACE FUNCTION update_coordinator_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE members
        SET events_coordinated_count = (
            SELECT COUNT(*) FROM event_coordinators WHERE member_id = NEW.member_id
        )
        WHERE id = NEW.member_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE members
        SET events_coordinated_count = (
            SELECT COUNT(*) FROM event_coordinators WHERE member_id = OLD.member_id
        )
        WHERE id = OLD.member_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_coordinator_count
AFTER INSERT OR DELETE ON event_coordinators
FOR EACH ROW
EXECUTE FUNCTION update_coordinator_count();

