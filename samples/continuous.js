(() => {
  let observer;

  // Function to send updates
  const sendUpdate = (data) => {
    if (typeof window.sendResult === "function") {
      window.sendResult(data);
    }
  };

  // Initialize the monitoring
  const startMonitoring = () => {
    // Send initial status
    sendUpdate({ type: "status", message: "Monitoring started" });

    // Track page scroll position
    let lastScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
      const currentScroll = window.scrollY;
      sendUpdate({
        type: "scroll",
        position: currentScroll,
        direction: currentScroll > lastScrollY ? "down" : "up",
      });
      lastScrollY = currentScroll;
    });

    // Monitor DOM changes
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          sendUpdate({
            type: "dom_change",
            added: mutation.addedNodes.length,
            removed: mutation.removedNodes.length,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Start observing the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Monitor network requests using Performance API
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();

        sendUpdate({
          type: "network",
          url: args[0],
          duration: endTime - startTime,
          status: response.status,
          timestamp: new Date().toISOString(),
        });

        return response;
      } catch (error) {
        sendUpdate({
          type: "network_error",
          url: args[0],
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    };

    // Set up periodic status updates
    setInterval(() => {
      sendUpdate({
        type: "periodic_update",
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
            }
          : null,
        timestamp: new Date().toISOString(),
      });
    }, 5000);
  };

  // Start monitoring
  startMonitoring();

  // The script will continue running and sending updates until stopped
  sendUpdate({ type: "init", message: "Monitoring script initialized" });
})();
