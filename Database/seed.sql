-- USERS
INSERT INTO users (name, email, password_hash, role)
VALUES
(
    'Field Officer 1',
    'fieldofficer1@eaii.org',
    '$2b$10$b.BSieG2PaKoddWR/LFtEeIny2OJ55cCKiao9cb2sExn7EUxBQlF6',
    'FIELD_OFFICER'
),
(
    'Field Officer 2',
    'fieldofficer2@eaii.org',
    '$2b$10$sacuSvt2pTSCWCthlahZoeWOT6.D/J.ql1aqxc0BfD9qlXjV.v6oG',
    'FIELD_OFFICER'
),
(
    'HQ Approver 1',
    'approver1@eaii.org',
    '$2b$10$sKdAsO5C9VBIFu/AbdFiA.p3vkff/tlZ8B2FJTjdnwOsfOcs/vvWm',
    'HQ_APPROVER'
),
(
    'System Admin 1',
    'admin1@eaii.org',
    '$2b$10$qnPQj2ZyovUgJaGdJ293NO8o5R2IvOq6scyrLUw/V3.boKyggg1KC',
    'ADMIN'
);

-- LOCATIONS
INSERT INTO locations (name, address)
VALUES
('Village Mauganj', 'Rewa District , Madhya Pradesh'),
('Village Mankehri', 'Satna District , Madhya Pradesh'),
('Village Sehpura', 'Jabalpur District , Madhya Pradesh');

-- VISITS
INSERT INTO visits
(title, purpose, location_id, planned_date, estimated_cost, status, created_by)
VALUES
(
    'Initial Water Survey',
    'Inspect water testing activities',
    1,
    '2026-09-20',
    2500.00,
    'DRAFT',
    1
),
(
    'Field Quality Check',
    'Review field water quality activities',
    2,
    '2026-09-22',
    3200.00,
    'PENDING',
    2
),
(
    'Program Monitoring Visit',
    'Monitor program implementation',
    3,
    '2026-09-24',
    4500.00,
    'APPROVED',
    1
),
(
    'Follow-up Inspection',
    'Follow up on previous field observations',
    1,
    '2026-09-26',
    2800.00,
    'REJECTED',
    2
),
(
    'Completed Field Visit',
    'Final field verification',
    1,
    '2026-09-15',
    3500.00,
    'COMPLETED',
    1
);

-- APPROVAL HISTORY
INSERT INTO approval_decisions
(visit_id, decided_by, decision, remark)
VALUES
(
    3,
    3,
    'APPROVED',
    'Visit plan reviewed and approved.'
),
(
    4,
    3,
    'REJECTED',
    'Please provide more details about the visit purpose.'
);