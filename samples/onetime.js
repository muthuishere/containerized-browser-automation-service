(async () => {
  try {
    console.log("Script started");
    // Wait for the search input to appear and type something
    const searchInput = await document.querySelector('input[name="q"]');
    if (searchInput) {
      searchInput.value = "Playwright automation";

      // Find and click the search button
      const searchButton = await document.querySelector('input[name="btnK"]');
      if (searchButton) {
        searchButton.click();

        // Wait for results
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Get search results
        const results = Array.from(document.querySelectorAll(".g")).map(
          (el) => ({
            title: el.querySelector("h3")?.textContent,
            url: el.querySelector("a")?.href,
          }),
        );

        return {
          message: "Search completed",
          results: results,
        };
      }
    }
  } catch (error) {
    return {
      error: error.message,
    };
  }
})();
