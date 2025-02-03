# Containerized Browser Control Service (BCS)
A containerized browser automation service that provides REST API control over Chrome/Chromium with real-time visual feedback. Built with Bun, Playwright, and Docker.


## Features

### Browser Control
- **REST API Interface**: Control browser through HTTP endpoints
- **Visual Monitoring**: Real-time browser view via VNC
- **Profile Management**: Persistent browser profiles
- **Window Control**: Show/hide browser window


### Script Execution
- **One-time Scripts**: Execute single operations
- **Continuous Scripts**: Run long-living scripts
- **Event Streaming**: Real-time execution feedback
- **File Upload**: Support for script file execution

### Visual Features
- **VNC Integration**: Live browser monitoring
- **DevTools Access**: Optional debugging interface
- **Flexible Display**: Configurable resolution
- **Fullscreen Support**: Proper window management

## Quick Start

```bash
# Clone repository
git clone git@github.com:muthuishere/containerized-browser-automation-service.git

# Navigate to directory
cd containerized-browser-automation-service

# Start service
docker-compose up -d

# Test the service
curl http://localhost:3000/api/browser/show
```

## API Reference

### Browser Control
```http
POST /api/goto
{
    "url": "https://example.com"
}

GET /api/browser/show
GET /api/browser/hide
POST /api/click
POST /api/type
```

### Script Management
```http
# Execute one-time script
POST /api/execute
Content-Type: text/plain

document.title

# Execute continuous script
POST /api/execute?type=continuous
Content-Type: text/plain

setInterval(() => {
    window.sendResult({scroll: window.scrollY})
}, 1000)

# Stop script
POST /api/execute/stop
{
    "scriptId": "script_123"
}
```

### Content Access
```http
GET /api/html
GET /show-vnc-viewer
```

## Configuration

### Environment Variables
```env
PROFILES_DIR=/chrome-profiles
SERVER_PORT=3000
DISPLAY_WIDTH=1920
DISPLAY_HEIGHT=1080
SHOW_DEVTOOLS=false
```

### Docker Compose
```yaml
services:
  browser-control:
    build: .
    ports:
      - "3000:3000"  # API
      - "8080:8080"  # VNC
    volumes:
      - ./chrome-profiles:/chrome-profiles
```

## Integration Examples

### Basic Navigation
```bash
# Navigate and capture
curl -X POST http://localhost:3000/api/goto \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'


```

### Script Execution
```bash
# Monitor scroll position
curl -X POST "http://localhost:3000/api/execute?type=continuous" \
  -H "Content-Type: text/plain" \
  --data-raw "setInterval(() => window.sendResult({scroll: window.scrollY}), 1000)"
```

### Visual Monitoring
```bash
# Access VNC viewer
open http://localhost:3000/show-vnc-viewer
```

## Development

### Prerequisites
- Docker & Docker Compose
- Bun runtime


### Project Structure
```
src/
├── services/
│   ├── browsers/         # Browser implementations
│   ├── browserManager.js # Browser lifecycle
│   ├── scriptExecutor.js # Script handling
│   └── scriptManager.js  # Script management
├── routes.js            # API endpoints
├── server.js            # Main server
└── config.js            # Configuration
```

### Running Locally
```bash
# Install dependencies
bun install

# Start development
docker-compose up --build

# View logs
docker-compose logs -f
```

## Common Use Cases

1. **Web Testing**
   - Automated UI testing
   - Visual regression testing
   - Cross-browser testing

2. **Web Automation**
   - Data extraction
   - Form automation
   - Site monitoring

3. **Debug & Development**
   - Visual debugging
   - Script testing
   - Browser automation development







## License

This project follows a dual-licensing model:

### Non-Commercial Use
- Free for personal, educational, and non-commercial use
- Must include original copyright and license notices
- Source code modifications must be shared under the same terms
- No warranty provided

### Commercial Use
- Requires purchasing a commercial license
- Contact [muthuishere](https://github.com/muthuishere) for licensing options
- Includes:
  - Commercial deployment rights
  - Priority support
  - Private modifications
  - Additional features
  - SLA guarantees


Using this software in a commercial setting without a valid commercial license is strictly prohibited. Unauthorized commercial use may result in legal action.

By using this software, you agree to abide by the terms of either the non-commercial or commercial license, depending on your usage context.


---

Built with ❤️ by [muthuishere](https://github.com/muthuishere)
