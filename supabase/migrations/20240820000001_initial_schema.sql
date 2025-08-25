-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE receipt_type AS ENUM ('income', 'expense');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create receipts table as per project requirements
CREATE TABLE receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type receipt_type DEFAULT 'expense' NOT NULL,
    vendor TEXT,
    description TEXT,
    date DATE,
    gross_amount NUMERIC(12,2),
    net_amount NUMERIC(12,2),
    vat_amount NUMERIC(12,2),
    vat_rate NUMERIC(5,2), -- e.g. 19.00, 7.00
    currency TEXT DEFAULT 'EUR',
    source_file_url TEXT, -- signed URL for uploaded receipt
    ocr_provider TEXT,
    raw_ocr_json JSONB,
    confidence JSONB, -- confidence scores per field (0-1)
    needs_review BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit log table for GoBD compliance (change tracking)
CREATE TABLE receipt_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create failed extractions table for error handling
CREATE TABLE failed_extractions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for receipts
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON receipts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON receipts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for audit log
CREATE POLICY "Users can view own audit log" ON receipt_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit log" ON receipt_audit_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for failed extractions
CREATE POLICY "Users can view own failed extractions" ON failed_extractions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own failed extractions" ON failed_extractions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own failed extractions" ON failed_extractions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(date DESC);
CREATE INDEX idx_receipts_type ON receipts(type);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX idx_receipts_needs_review ON receipts(needs_review) WHERE needs_review = true;

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_failed_extractions_updated_at BEFORE UPDATE ON failed_extractions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION log_receipt_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to important fields
    IF OLD.vendor IS DISTINCT FROM NEW.vendor THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'vendor', OLD.vendor, NEW.vendor);
    END IF;
    
    IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'description', OLD.description, NEW.description);
    END IF;
    
    IF OLD.gross_amount IS DISTINCT FROM NEW.gross_amount THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'gross_amount', OLD.gross_amount::TEXT, NEW.gross_amount::TEXT);
    END IF;
    
    IF OLD.net_amount IS DISTINCT FROM NEW.net_amount THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'net_amount', OLD.net_amount::TEXT, NEW.net_amount::TEXT);
    END IF;
    
    IF OLD.vat_amount IS DISTINCT FROM NEW.vat_amount THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'vat_amount', OLD.vat_amount::TEXT, NEW.vat_amount::TEXT);
    END IF;
    
    IF OLD.date IS DISTINCT FROM NEW.date THEN
        INSERT INTO receipt_audit_log (receipt_id, user_id, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, 'date', OLD.date::TEXT, NEW.date::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
CREATE TRIGGER receipt_audit_trigger
    AFTER UPDATE ON receipts
    FOR EACH ROW EXECUTE PROCEDURE log_receipt_changes();
