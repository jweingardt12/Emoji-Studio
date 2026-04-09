export default function InstallCertPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          📱 Install mkcert Root CA for iOS
        </h1>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">
            ⚠️ This is the mkcert Root CA certificate for local development only. Only install if you're developing Emoji Studio.
          </p>
        </div>

        <p className="mb-6 text-gray-700">
          To use HTTPS on your iOS device, you need to install and trust the development certificate:
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </span>
              <strong>Download Root CA Certificate</strong>
            </div>
            <p className="text-sm text-gray-600 mb-3 ml-10">
              Click the button below to download the mkcert Root CA:
            </p>
            <div className="ml-10">
              <a 
                href="/api/cert" 
                className="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                download
              >
                Download mkcert Root CA
              </a>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </span>
              <strong>Install Profile</strong>
            </div>
            <p className="text-sm text-gray-600 ml-10">
              After downloading, go to{" "}
              <strong>Settings → General → VPN & Device Management</strong>
            </p>
            <p className="text-sm text-gray-600 ml-10 mt-2">
              You'll see a downloaded profile. Tap it and install it.
            </p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </span>
              <strong>Trust Certificate (CRITICAL STEP)</strong>
            </div>
            <p className="text-sm text-red-700 font-semibold ml-10">
              ⚠️ This step is often missed but is REQUIRED for HTTPS to work!
            </p>
            <p className="text-sm text-gray-600 ml-10 mt-2">
              Go to{" "}
              <strong>Settings → General → About → Certificate Trust Settings</strong>
            </p>
            <p className="text-sm text-gray-600 ml-10 mt-2">
              Toggle ON "Enable full trust" for <strong>"mkcert jason@mac.home"</strong>
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                4
              </span>
              <strong>Access via HTTPS</strong>
            </div>
            <p className="text-sm text-gray-600 ml-10">
              After completing all steps above, restart Safari and access:
            </p>
            <code className="block ml-10 mt-2 bg-gray-100 px-3 py-2 rounded text-sm">
              https://192.168.86.71:3001
            </code>
            <p className="text-xs text-gray-500 ml-10 mt-2">
              Note: You must complete the trust step in Certificate Trust Settings
            </p>
          </div>
        </div>

        <p className="mt-8 text-gray-500 text-xs">
          Note: This is a self-signed certificate for development only. Never install untrusted certificates from unknown sources.
        </p>
      </div>
    </div>
  )
}