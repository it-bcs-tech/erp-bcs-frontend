CREATE SCHEMA IF NOT EXISTS dms;

-- 1. Master Document Type
CREATE TABLE IF NOT EXISTS dms.m_doc_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Document Category
CREATE TABLE IF NOT EXISTS dms.m_doc_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type_id UUID REFERENCES dms.m_doc_type(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Master Notary
CREATE TABLE IF NOT EXISTS dms.m_notary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Master Filing Physical Location (Cabinet, Shelf, Slot)
CREATE TABLE IF NOT EXISTS dms.m_filing_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Master Issuer (Dishub, Samsat, Kemenhub, etc.)
CREATE TABLE IF NOT EXISTS dms.m_issuer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Main Documents Table
CREATE TABLE IF NOT EXISTS dms.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_number VARCHAR(100) UNIQUE,
    doc_type_id UUID REFERENCES dms.m_doc_type(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    entity_type VARCHAR(30) DEFAULT 'CORPORATE', -- 'FLEET', 'DRIVER', 'CUSTOMER', 'CORPORATE'
    
    partner_id UUID REFERENCES master.m_customer(id) ON DELETE SET NULL,
    asset_id BIGINT REFERENCES fleet.unit(id) ON DELETE SET NULL,
    employee_id BIGINT REFERENCES master.m_drivers(id) ON DELETE SET NULL,
    notary_id UUID REFERENCES dms.m_notary(id) ON DELETE SET NULL,
    issuer_id UUID REFERENCES dms.m_issuer(id) ON DELETE SET NULL,
    
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWAL_IN_PROGRESS', 'REVOKED'
    current_version INT DEFAULT 1,
    
    physical_status VARCHAR(30) DEFAULT 'IN_STORAGE', -- 'IN_STORAGE', 'BORROWED', 'ARCHIVED_OFFSITE'
    qr_code_id VARCHAR(100),
    filing_location_id UUID REFERENCES dms.m_filing_location(id) ON DELETE SET NULL,
    file_path TEXT,
    notes TEXT,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- 7. Document Versioning & Renewal Snapshots
CREATE TABLE IF NOT EXISTS dms.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    doc_number VARCHAR(100),
    title VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    file_path TEXT,
    change_summary TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- 8. Physical Custody & Check-Out/Check-In Logs
CREATE TABLE IF NOT EXISTS dms.document_custody_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms.documents(id) ON DELETE CASCADE,
    action VARCHAR(30) NOT NULL, -- 'CHECK_OUT', 'CHECK_IN'
    borrower_name VARCHAR(255) NOT NULL,
    borrower_role VARCHAR(100),
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    purpose TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- 9. Immutable Audit Trail (ISO 27001)
CREATE TABLE IF NOT EXISTS dms.document_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES dms.documents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'VIEW', 'DOWNLOAD', 'UPDATE', 'RENEW', 'CUSTODY_CHECKOUT', 'CUSTODY_CHECKIN', 'DELETE'
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

