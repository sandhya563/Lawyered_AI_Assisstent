-- AI Will Maker - Database Schema
-- Part 2: Design the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Part 1: Sign up and log in)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Will status enum: separates "not finished yet", "has a real problem", "ready"
CREATE TYPE will_status AS ENUM ('draft', 'in_progress', 'complete', 'invalid');

-- Wills table - the main document, saveable even when half-finished
CREATE TABLE wills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status will_status DEFAULT 'draft',
    
    -- Testator (the person making the will) details
    testator_full_name VARCHAR(255),
    testator_age INTEGER,
    testator_address TEXT,
    testator_sound_mind BOOLEAN DEFAULT FALSE,
    
    -- Guardian (only needed if children under 18)
    guardian_name VARCHAR(255),
    guardian_relationship VARCHAR(100),
    guardian_address TEXT,
    has_minor_children BOOLEAN DEFAULT FALSE,
    
    -- Executor
    executor_name VARCHAR(255),
    executor_relationship VARCHAR(100),
    executor_address TEXT,
    
    -- Signature section
    signing_date DATE,
    signing_place VARCHAR(255),
    
    -- AI conversation state - keeps a tidy summary instead of full history
    conversation_summary TEXT,
    missing_fields JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table - things they own
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'property', 'bank_account', 'vehicle', 'jewellery', 'investment', 'other'
    estimated_value VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beneficiaries table - people who inherit
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset allocations - connects assets to beneficiaries with share percentages
-- This is the key join: who gets what share of which asset
CREATE TABLE asset_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    share_percentage DECIMAL(5,2) NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
    conditions TEXT, -- any conditions on the inheritance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique allocation per asset-beneficiary pair
    UNIQUE(asset_id, beneficiary_id)
);

-- Witnesses table - at least two required
CREATE TABLE witnesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    address TEXT,
    is_beneficiary BOOLEAN DEFAULT FALSE, -- soft warning if true
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation messages - store the chat history for context
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    extracted_data JSONB, -- structured data extracted from this message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lawyer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_wills_user_id ON wills(user_id);
CREATE INDEX idx_wills_status ON wills(status);
CREATE INDEX idx_assets_will_id ON assets(will_id);
CREATE INDEX idx_beneficiaries_will_id ON beneficiaries(will_id);
CREATE INDEX idx_asset_allocations_asset_id ON asset_allocations(asset_id);
CREATE INDEX idx_asset_allocations_beneficiary_id ON asset_allocations(beneficiary_id);
CREATE INDEX idx_witnesses_will_id ON witnesses(will_id);
CREATE INDEX idx_conversation_messages_will_id ON conversation_messages(will_id);
CREATE INDEX idx_conversation_messages_created ON conversation_messages(will_id, created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wills_updated_at BEFORE UPDATE ON wills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beneficiaries_updated_at BEFORE UPDATE ON beneficiaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_witnesses_updated_at BEFORE UPDATE ON witnesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
