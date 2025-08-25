const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugStorage() {
  console.log('Debugging storage access...')
  
  try {
    // Check bucket configuration
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      console.error('Bucket list error:', bucketError)
      return
    }
    
    const receiptsBucket = buckets.find(b => b.name === 'receipts')
    console.log('Receipts bucket config:', receiptsBucket)
    
    // List files in bucket
    const { data: files, error: listError } = await supabase.storage
      .from('receipts')
      .list('', { limit: 10 })
    
    if (listError) {
      console.error('File list error:', listError)
      return
    }
    
    console.log('Files in bucket:', files)
    
    // Query recent receipts
    const { data: receipts, error: dbError } = await supabase
      .from('receipts')
      .select('id, source_file_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (dbError) {
      console.error('Database error:', dbError)
      return
    }
    
    console.log('Recent receipts:', receipts)
    
    // Test URL access for each receipt
    for (const receipt of receipts) {
      if (receipt.source_file_url) {
        console.log(`\nTesting URL: ${receipt.source_file_url}`)
        
        // Try to get signed URL if it's a storage path
        if (receipt.source_file_url.includes('supabase')) {
          try {
            const urlParts = new URL(receipt.source_file_url)
            const path = urlParts.pathname.split('/storage/v1/object/public/receipts/')[1]
            
            if (path) {
              console.log(`Storage path: ${path}`)
              
              // Get signed URL for private access
              const { data: signedUrl, error: signError } = await supabase.storage
                .from('receipts')
                .createSignedUrl(path, 3600) // 1 hour
              
              if (signError) {
                console.error('Signed URL error:', signError)
              } else {
                console.log('Signed URL created:', signedUrl.signedUrl)
              }
            }
          } catch (urlError) {
            console.error('URL parsing error:', urlError)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

debugStorage()
