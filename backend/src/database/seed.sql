-- Seed data: Demo user and a completed sample will
-- Password for demo user: "Demo@123" (bcrypt hashed)

INSERT INTO users (id, email, password_hash, full_name) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'demo@willmaker.com', '$2b$10$rQZK8Qz7x5Y5Y5Y5Y5Y5YexamplehashforDemoUser123456', 'Rajesh Kumar');

-- A completed sample will
INSERT INTO wills (
    id, user_id, status,
    testator_full_name, testator_age, testator_address, testator_sound_mind,
    guardian_name, guardian_relationship, guardian_address, has_minor_children,
    executor_name, executor_relationship, executor_address,
    signing_date, signing_place,
    conversation_summary, missing_fields, completed_at
) VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'complete',
    'Rajesh Kumar', 52, '42 MG Road, Pune, Maharashtra 411001', TRUE,
    'Priya Sharma', 'Sister', '15 Park Street, Pune, Maharashtra 411002', TRUE,
    'Amit Kumar', 'Brother', '88 Residency Road, Mumbai, Maharashtra 400001',
    '2024-12-15', 'Pune, Maharashtra',
    'Rajesh Kumar, 52, from Pune has completed his will. He has a house in Pune worth 1.5 crore, a fixed deposit of 30 lakhs, gold jewellery worth 10 lakhs, and a car. His daughter Ananya (16) gets the house and 50% of FD. His son Vikram (14) gets gold and 50% of FD. His wife Meena gets the car. Brother Amit is executor. Sister Priya is guardian for minor children. Two witnesses: colleague Suresh and neighbor Ramesh.',
    '[]'::jsonb,
    '2024-12-15 10:30:00+05:30'
);

-- Assets for the sample will
INSERT INTO assets (id, will_id, description, asset_type, estimated_value) VALUES
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Residential house at 42 MG Road, Pune', 'property', '1.5 Crore'),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Fixed Deposit in SBI, Account No. XXXX1234', 'bank_account', '30 Lakhs'),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Gold jewellery collection (necklaces, bangles, rings)', 'jewellery', '10 Lakhs'),
('f6a7b8c9-d0e1-2345-fabc-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Maruti Suzuki Ciaz, Registration MH-12-XX-1234', 'vehicle', '8 Lakhs');

-- Beneficiaries
INSERT INTO beneficiaries (id, will_id, full_name, relationship, date_of_birth, address) VALUES
('11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ananya Kumar', 'Daughter', '2008-05-15', '42 MG Road, Pune, Maharashtra 411001'),
('22222222-2222-2222-2222-222222222222', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Vikram Kumar', 'Son', '2010-11-20', '42 MG Road, Pune, Maharashtra 411001'),
('33333333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Meena Kumar', 'Wife', '1975-03-08', '42 MG Road, Pune, Maharashtra 411001');

-- Asset allocations - who gets what share
INSERT INTO asset_allocations (asset_id, beneficiary_id, share_percentage, conditions) VALUES
-- House goes 100% to daughter
('c3d4e5f6-a7b8-9012-cdef-123456789012', '11111111-1111-1111-1111-111111111111', 100.00, 'To be held in trust until she turns 18'),
-- FD split 50/50 between daughter and son
('d4e5f6a7-b8c9-0123-defa-234567890123', '11111111-1111-1111-1111-111111111111', 50.00, NULL),
('d4e5f6a7-b8c9-0123-defa-234567890123', '22222222-2222-2222-2222-222222222222', 50.00, NULL),
-- Gold goes 100% to son
('e5f6a7b8-c9d0-1234-efab-345678901234', '22222222-2222-2222-2222-222222222222', 100.00, NULL),
-- Car goes 100% to wife
('f6a7b8c9-d0e1-2345-fabc-456789012345', '33333333-3333-3333-3333-333333333333', 100.00, NULL);

-- Witnesses
INSERT INTO witnesses (will_id, full_name, address, is_beneficiary) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Suresh Patil', '55 FC Road, Pune, Maharashtra 411004', FALSE),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ramesh Deshmukh', '44 MG Road, Pune, Maharashtra 411001', FALSE);

-- Sample conversation messages
INSERT INTO conversation_messages (will_id, role, content, extracted_data) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'assistant', 'Hello! I''m here to help you create your will. Let''s start with some basic information about you. What is your full name?', NULL),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'user', 'My name is Rajesh Kumar, I''m 52 years old and I live at 42 MG Road, Pune.', '{"testator_full_name": "Rajesh Kumar", "testator_age": 52, "testator_address": "42 MG Road, Pune, Maharashtra 411001"}'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'assistant', 'Thank you, Rajesh. Now, could you tell me about the assets you''d like to include in your will? These could be property, bank accounts, vehicles, jewellery, or investments.', NULL),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'user', 'I have my house in Pune worth about 1.5 crore, an FD of 30 lakhs in SBI, some gold jewellery worth around 10 lakhs, and my car - a Maruti Ciaz.', '{"assets": [{"description": "House in Pune", "type": "property", "value": "1.5 Crore"}, {"description": "FD in SBI", "type": "bank_account", "value": "30 Lakhs"}, {"description": "Gold jewellery", "type": "jewellery", "value": "10 Lakhs"}, {"description": "Maruti Ciaz", "type": "vehicle", "value": "8 Lakhs"}]}'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'assistant', 'That''s a good list. Now, who would you like to leave these assets to? Please tell me their names, how they are related to you, and what each person should receive.', NULL),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'user', 'My daughter Ananya should get the house and half the FD. My son Vikram gets the gold and the other half of FD. My wife Meena gets the car. Both kids are minors - Ananya is 16 and Vikram is 14.', '{"beneficiaries": [{"name": "Ananya Kumar", "relationship": "Daughter", "dob": "2008-05-15"}, {"name": "Vikram Kumar", "relationship": "Son", "dob": "2010-11-20"}, {"name": "Meena Kumar", "relationship": "Wife"}], "has_minor_children": true}');
