Tasks

- Make an app to be deployed a nodejs


google-chrome-stable --no-sandbox --kiosk "https://www.yahoo.com" \
  --use-fake-ui-for-media-stream \
  --use-fake-device-for-media-stream \
  --enable-audio-service \
  --alsa-output-device=default \
  --disable-dev-shm-usage \
  --disable-features=TranslateUI \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check



google-chrome-stable --no-sandbox --kiosk "https://www.deemwar.com" \
  --use-fake-ui-for-media-stream \
  --use-fake-device-for-media-stream \
  --enable-audio-service \
  --alsa-output-device=default \
  --disable-dev-shm-usage \
  --disable-features=TranslateUI \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check




```bash
# Get page title
make execute-script script="document.title"

# Get current URL
make execute-script script="window.location.href"

# Get element text
make execute-script script=`document.querySelector('.service-card').textContent`


curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "document.querySelector('.service-card').textContent"}'


```



```bash
# Monitor scroll position
make execute-continuous script="setInterval(() => window.sendResult({scroll: window.scrollY}), 1000)"

# Monitor element changes
make execute-continuous script="
  const target = document.querySelector('.my-element');
  const observer = new MutationObserver(() => {
    window.sendResult({
      content: target.textContent,
      timestamp: Date.now()
    });
  });
  observer.observe(target, { childList: true, subtree: true });
  window.scriptCleanup_SCRIPT_ID = () => observer.disconnect();
"
```


3. Using curl directly:
```bash
# One-time script
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "document.title"}'

# Continuous script
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "setInterval(() => window.sendResult({time: Date.now()}), 1000)",
    "continuous": true
  }'

# Stop script
curl -X POST http://localhost:3000/api/execute/stop \
  -H "Content-Type: application/json" \
  -d '{"scriptId": "script_123456"}'
```




4. Using JavaScript/fetch:
```javascript
// One-time script
const response = await fetch('http://localhost:3000/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'document.title'
  })
});
const result = await response.json();
console.log(result);

// Continuous script with SSE
const response = await fetch('http://localhost:3000/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'setInterval(() => window.sendResult({time: Date.now()}), 1000)',
    continuous: true
  })
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
