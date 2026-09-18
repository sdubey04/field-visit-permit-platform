CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (
        role IN ('FIELD_OFFICER', 'HQ_APPROVER', 'ADMIN')
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
   title VARCHAR(200) NOT NULL CHECK (BTRIM(title) <> ''),
   purpose TEXT NOT NULL CHECK (BTRIM(purpose) <> ''),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    planned_date DATE NOT NULL,
    estimated_cost NUMERIC(12, 2) NOT NULL CHECK (estimated_cost >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'PENDING',
            'APPROVED',
            'REJECTED',
            'COMPLETED'
        )
    ),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approval_decisions (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    decided_by INTEGER NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (
        decision IN ('APPROVED', 'REJECTED')
    ),
    remark TEXT,
    CHECK (
        decision = 'APPROVED'
        OR NULLIF(BTRIM(remark), '') IS NOT NULL
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email
    ON users(email);

CREATE INDEX idx_visits_created_by
    ON visits(created_by);

CREATE INDEX idx_visits_status
    ON visits(status);

CREATE INDEX idx_visits_location_id
    ON visits(location_id);

CREATE INDEX idx_approval_decisions_visit_id
    ON approval_decisions(visit_id);