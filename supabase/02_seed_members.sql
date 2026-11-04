-- ============================================
-- CSI Operations - Seed Members Data
-- Run this SECOND (after schema)
-- ============================================

INSERT INTO members (name, role, domain, class_batch, member_type, is_active, events_coordinated_count) VALUES
('Gayathri Binoj', 'President', 'Executive', 'S7 CS B', 'old_coordinator', TRUE, 1),
('Abhishek Joby', 'Vice President', 'Executive', 'S7 CS A', 'old_coordinator', TRUE, 1),
('Ayyappadas S', 'Secretary', 'Executive', 'S7 CS A', 'old_coordinator', TRUE, 2),
('Fathima Naja', 'Joint Secretary', 'Executive', 'S7 CSBS', 'old_coordinator', TRUE, 2),
('Suraj S Panickar', 'Treasurer', 'Executive', 'S7 CS C', 'old_coordinator', TRUE, 0),
('Vishnu M P', 'Executive Coordinator', 'Executive', 'S7 CSBS', 'old_coordinator', TRUE, 1),
('Aron Varghese John', 'Operations Lead', 'Operations', 'S7 CS A', 'old_coordinator', TRUE, 2),
('Sneha Phinoo', 'Operations Co-Lead', 'Operations', 'S5 CS D', 'old_coordinator', TRUE, 1),
('Sreya Raj', 'Creative Lead', 'Creative', 'S7 IT', 'old_coordinator', TRUE, 0),
('Kripa Ann John', 'Creative Co-Lead', 'Creative', 'S5 CS C', 'old_coordinator', TRUE, 2),
('Aafiya Shameer', 'Documentation Lead', 'Documentation', 'S7 CS A', 'old_coordinator', TRUE, 3),
('June Maria Sudhil', 'Documentation Co-Lead', 'Documentation', 'S5 AD', 'new_coordinator', TRUE, 2),
('Alina Mary John', 'Marketing Lead', 'Marketing', 'S7 IT', 'old_coordinator', TRUE, 1),
('Ben George Simon', 'Marketing Co-Lead', 'Marketing', 'S3 IT', 'new_coordinator', TRUE, 2),
('Soorya Das K S', 'Technical Lead', 'Technical', 'S5 IT', 'old_coordinator', TRUE, 3),
('Riyan Raz', 'Technical Co-Lead', 'Technical', 'S5 CS D', 'new_coordinator', TRUE, 1),
('Anjali Shaju', 'Sub-Core (Documentation)', 'Documentation', 'S3 CS A', 'new_coordinator', TRUE, 2),
('Vaishnavi Dev Thekke Veedu', 'Sub-Core (Creative)', 'Creative', 'S3 CS D', 'new_coordinator', TRUE, 2),
('Jovit Jerry', 'Sub-Core (Creative)', 'Creative', 'S5 CSBS', 'new_coordinator', TRUE, 2),
('Lanet Varghese', 'Sub-Core (Operations)', 'Operations', 'S5 CSBS', 'old_coordinator', TRUE, 0),
('Elizabeth Joby', 'Sub-Core (Operations)', 'Operations', 'S3 AD', 'new_coordinator', TRUE, 2),
('Avanthika S', 'Sub-Core (Marketing)', 'Marketing', 'S3 AD', 'new_coordinator', TRUE, 1),
('Krishna Priya K R', 'Sub-Core (Creative)', 'Creative', 'S3 AD', 'new_coordinator', TRUE, 1);

