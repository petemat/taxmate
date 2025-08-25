const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createReceiptsBucket() {
  console.log('Creating receipts storage bucket...')
  
  try {
    // First check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }
    
    console.log('Existing buckets:', buckets.map(b => b.name))
    
    const receiptsBucket = buckets.find(b => b.name === 'receipts')
    
    if (receiptsBucket) {
      console.log('✅ Receipts bucket already exists')
      return
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('receipts', {
      public: false, // Private bucket for GDPR compliance
      fileSizeLimit: 10485760, // 10MB limit
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    })
    
    if (error) {
      console.error('Error creating bucket:', error)
      return
    }
    
    console.log('✅ Receipts bucket created successfully:', data)
    
    // Test bucket access
    const { data: testData, error: testError } = await supabase.storage
      .from('receipts')
      .list()
    
    if (testError) {
      console.error('Error testing bucket access:', testError)
    } else {
      console.log('✅ Bucket access test successful')
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createReceiptsBucket()
