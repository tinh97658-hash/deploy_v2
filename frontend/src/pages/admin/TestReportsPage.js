import React, { useState, useEffect } from 'react';
// Removed unused getAuthToken import

const TestReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test debug endpoint without auth first
        console.log('Testing debug endpoint...');
  const debugResponse = await fetch('/api/admin/reports/debug');
        const debugResult = await debugResponse.json();
        console.log('Debug endpoint result:', debugResult);
        
        // Test authenticated endpoint
        console.log('Testing authenticated endpoint with credentials...');
  const response = await fetch('/api/admin/reports/test', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        console.log('Auth test response status:', response.status);
        const result = await response.json();
        
        if (response.ok) {
          setData({ debug: debugResult, auth: result });
        } else {
          setError(result.message || 'API test failed');
        }
      } catch (err) {
        console.error('Test error:', err);
        setError('Network error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  const testDashboardAPI = async () => {
    try {
      setLoading(true);
  const response = await fetch('/api/admin/reports/dashboard-overview?timeRange=30', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const result = await response.json();
      console.log('Dashboard API response:', result);
      
      if (response.ok) {
        setData({ ...data, dashboardTest: result });
      } else {
        setError('Dashboard API failed: ' + result.message);
      }
    } catch (err) {
      setError('Dashboard API error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testOrganizationalAPI = async () => {
    try {
      setLoading(true);
  const response = await fetch('/api/admin/reports/organizational?level=department&timeRange=30', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const result = await response.json();
      console.log('Organizational API response:', result);
      
      if (response.ok) {
        setData({ ...data, organizationalTest: result });
      } else {
        setError('Organizational API failed: ' + result.message);
      }
    } catch (err) {
      setError('Organizational API error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPI = async () => {
    try {
      setLoading(true);
      console.log('Testing direct API call...');
      
      // Test the actual overview endpoint that's failing
  const response = await fetch('/api/admin/reports/dashboard-overview?timeRange=30', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      console.log('Direct API response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct API error text:', errorText);
        setError(`Direct API failed: ${response.status} - ${errorText.substring(0, 200)}`);
        return;
      }
      
      const result = await response.json();
      console.log('Direct API result:', result);
      
      setData(prev => ({ ...prev, directTest: result }));
      
    } catch (err) {
      console.error('Direct API error:', err);
      setError('Direct API error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading test...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Advanced Reports API</h1>
      
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '15px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testDashboardAPI} style={{ marginRight: '10px' }}>
          Test Dashboard API
        </button>
        <button onClick={testOrganizationalAPI} style={{ marginRight: '10px' }}>
          Test Organizational API
        </button>
        <button onClick={testDirectAPI}>
          Test Direct Overview API
        </button>
      </div>

      {data && (
        <div>
          <h2>API Response:</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '500px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestReportsPage;
