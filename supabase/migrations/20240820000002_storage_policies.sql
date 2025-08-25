-- Create storage bucket for receipt files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false, -- private bucket for GDPR compliance
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Storage policies for receipts bucket
-- Users can only access their own files
CREATE POLICY "Users can view own receipt files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own receipt files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own receipt files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own receipt files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create view for receipt summaries (for performance)
CREATE VIEW receipt_summaries AS
SELECT 
    user_id,
    type,
    COUNT(*) as count,
    SUM(gross_amount) as total_gross,
    SUM(net_amount) as total_net,
    SUM(vat_amount) as total_vat,
    DATE_TRUNC('month', date) as month
FROM receipts
WHERE date IS NOT NULL AND gross_amount IS NOT NULL
GROUP BY user_id, type, DATE_TRUNC('month', date);

-- RLS for the view
ALTER VIEW receipt_summaries SET (security_invoker = true);

-- Create function to calculate VAT amounts based on German tax rates
CREATE OR REPLACE FUNCTION calculate_vat_amounts(
    gross_amount NUMERIC,
    net_amount NUMERIC,
    vat_rate NUMERIC
) RETURNS TABLE(
    calculated_gross NUMERIC,
    calculated_net NUMERIC,
    calculated_vat NUMERIC,
    calculated_rate NUMERIC
) AS $$
BEGIN
    -- If we have gross and rate, calculate net and vat
    IF gross_amount IS NOT NULL AND vat_rate IS NOT NULL THEN
        calculated_gross := gross_amount;
        calculated_rate := vat_rate;
        calculated_net := ROUND(gross_amount / (1 + vat_rate / 100), 2);
        calculated_vat := ROUND(gross_amount - calculated_net, 2);
        RETURN NEXT;
    -- If we have net and rate, calculate gross and vat
    ELSIF net_amount IS NOT NULL AND vat_rate IS NOT NULL THEN
        calculated_net := net_amount;
        calculated_rate := vat_rate;
        calculated_gross := ROUND(net_amount * (1 + vat_rate / 100), 2);
        calculated_vat := ROUND(calculated_gross - net_amount, 2);
        RETURN NEXT;
    -- If we have gross and net, calculate vat and rate
    ELSIF gross_amount IS NOT NULL AND net_amount IS NOT NULL THEN
        calculated_gross := gross_amount;
        calculated_net := net_amount;
        calculated_vat := ROUND(gross_amount - net_amount, 2);
        -- Calculate rate: ((gross - net) / net) * 100
        IF net_amount > 0 THEN
            calculated_rate := ROUND(((gross_amount - net_amount) / net_amount) * 100, 2);
        ELSE
            calculated_rate := 0;
        END IF;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
