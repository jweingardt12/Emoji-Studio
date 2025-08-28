import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Read the ROOT CA certificate file (not the site certificate)
    // iOS needs the root CA to trust all certificates signed by it
    const certPath = join(process.cwd(), 'certificates', 'rootCA.pem')
    const certContent = readFileSync(certPath)
    
    // Return the certificate with proper headers for iOS
    return new NextResponse(certContent, {
      headers: {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="mkcert-rootCA.crt"',
      },
    })
  } catch (error) {
    console.error('Failed to serve certificate:', error)
    return NextResponse.json(
      { error: 'Certificate not found' },
      { status: 404 }
    )
  }
}