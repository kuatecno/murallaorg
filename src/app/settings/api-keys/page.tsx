'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    // Load existing API key (if any)
    const existingKey = apiClient.getApiKey();
    if (existingKey) {
      setSavedKey(existingKey);
      // Mask the key for display
      setApiKey(maskApiKey(existingKey));
    }
  }, [router]);

  const maskApiKey = (key: string) => {
    if (!key || key.length < 20) return key;
    return `${key.substring(0, 15)}...${key.substring(key.length - 4)}`;
  };

  const handleSaveApiKey = () => {
    if (!apiKey || apiKey.includes('...')) {
      alert('Please enter a valid API key');
      return;
    }

    // Validate key format
    if (!apiKey.startsWith('muralla_live_') && !apiKey.startsWith('muralla_test_')) {
      alert('Invalid API key format. Key should start with muralla_live_ or muralla_test_');
      return;
    }

    // Save the API key
    apiClient.setApiKey(apiKey);
    setSavedKey(apiKey);
    setApiKey(maskApiKey(apiKey));
    setShowKey(false);
    alert('API key saved successfully!');
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');

    try {
      // Test the API key by fetching products
      const response = await apiClient.get('/api/products?limit=1');
      
      if (response.ok) {
        setTestStatus('success');
        setTestMessage('✅ Connection successful! Your API key is working.');
      } else if (response.status === 401) {
        setTestStatus('error');
        setTestMessage('❌ Authentication failed. Please check your API key.');
      } else {
        setTestStatus('error');
        setTestMessage(`❌ Connection failed with status: ${response.status}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`❌ Connection error: ${error}`);
    }
  };

  const handleClearApiKey = () => {
    if (confirm('Are you sure you want to clear the API key?')) {
      apiClient.clearApiKey();
      setApiKey('');
      setSavedKey('');
      setTestStatus('idle');
      setTestMessage('');
      alert('API key cleared');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">API Key Configuration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure your API key to authenticate with the Muralla API
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* API Key Input */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="muralla_live_..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
                {savedKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter your Muralla API key. The key should start with 'muralla_live_' or 'muralla_test_'
              </p>
            </div>

            {/* Test Connection */}
            {savedKey && (
              <div>
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                {testMessage && (
                  <p className={`mt-2 text-sm ${
                    testStatus === 'success' ? 'text-green-600' : 
                    testStatus === 'error' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {testMessage}
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">How to Generate an API Key</h3>
              <div className="prose prose-sm text-gray-600">
                <ol className="space-y-2">
                  <li>
                    <strong>Using the command line:</strong>
                    <pre className="bg-gray-100 p-2 rounded mt-1">
                      npx tsx scripts/generate-api-key.ts
                    </pre>
                  </li>
                  <li>
                    The script will generate a new API key for your tenant and display it in the console.
                  </li>
                  <li>
                    <strong>Important:</strong> Save the API key immediately as it won't be shown again!
                  </li>
                  <li>
                    Copy the generated key and paste it in the field above.
                  </li>
                </ol>
              </div>
            </div>

            {/* Current Status */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Status</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="font-medium">API Key Configured:</span>
                  <span className={savedKey ? 'text-green-600' : 'text-red-600'}>
                    {savedKey ? '✅ Yes' : '❌ No'}
                  </span>
                </p>
                {savedKey && (
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Key Type:</span>
                    <span className="text-gray-600">
                      {savedKey.startsWith('muralla_live_') ? '🔐 Production' : '🧪 Test'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Warning */}
            {!savedKey && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    ⚠️
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Without an API key, you won't be able to access products, categories, and other API endpoints.
                      Please generate and configure an API key to continue.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
