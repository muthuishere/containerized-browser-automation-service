### Script Execution Examples

1. Using make commands:
```bash
# Get page title (one-time execution)
make execute-script script="document.title"

# Get current URL
make execute-script script="window.location.href"

# Get element text
make execute-script script="document.querySelector('.service-card').textContent"

# Start continuous monitoring (with query parameter)
make execute-continuous script="setInterval(() => window.sendResult({scroll: window.scrollY}), 1000)"
```



2. Using curl directly:
```bash
# One-time script execution
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: text/plain" \
  -d 'document.title'

# Continuous script execution
curl -X POST "http://localhost:3000/api/execute?type=continuous" \
  -H "Content-Type: text/plain" \
  -d 'setInterval(() => window.sendResult({time: Date.now()}), 1000)'

# Stop script
curl -X POST http://localhost:3000/api/execute/stop \
  -H "Content-Type: application/json" \
  -d '{"scriptId": "script_123456"}'
```

3. Using JavaScript/fetch:
```javascript
// One-time script
const response = await fetch('http://localhost:3000/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'document.title'
});
const result = await response.json();
console.log(result);

// Continuous script with SSE
const response = await fetch('http://localhost:3000/api/execute?type=continuous', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'setInterval(() => window.sendResult({time: Date.now()}), 1000)'
});

const scriptId = response.headers.get('X-Script-ID');

// Listen for events
const events = new EventSource(`http://localhost:3000/api/execute?scriptId=${scriptId}`);
events.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Cleanup when done
events.close();
await fetch('http://localhost:3000/api/execute/stop', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scriptId })
});
```
