# 🧪 Test API - See Actual Response

## Test in Browser Console

Run this in your browser console (it will show the actual response):

```javascript
(async () => {
  try {
    const response = await fetch('http://localhost:3001/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-' + Date.now(),
        header: 'Test Set',
        type: 'short',
        jokes: [],
        jokeDetails: [],
        transitions: [],
        isDraft: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', data);
    
    if (!response.ok) {
      console.error('❌ Error:', data);
    } else {
      console.log('✅ Success!');
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error);
  }
})();
```

This will show you:
- The HTTP status code
- The actual response data
- Any errors

**What do you see?** Share the console output.

