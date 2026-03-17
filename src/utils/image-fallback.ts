export function getProductionImageUrl(imageUrl: string): string {
  // Check if we're on net-static-dev.chainbasehq.com/buildermaps
  const isNetStaticDev =
    window.location.hostname === "net-static-dev.chainbasehq.com";
  const isBuildermapsPath = window.location.pathname.startsWith("/buildermaps");

  if (!isNetStaticDev || !isBuildermapsPath) {
    return imageUrl;
  }

  // Check if it's a relative path like /imgs/alphakek.jpg
  if (imageUrl.startsWith("/imgs/")) {
    const filename = imageUrl.replace("/imgs/", "");
    // Ensure '+' in path segments is encoded as '%2B'
    const safeFilename = filename.replace(/\+/g, "%2B");
    return `https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/${safeFilename}`;
  }

  // If it's already a full URL, return as-is
  return imageUrl;
}

export function getLocalhostFallback(imageUrl: string): string | null {
  // Check if we're on net-static-dev.chainbasehq.com/buildermaps
  const isNetStaticDev =
    window.location.hostname === "net-static-dev.chainbasehq.com";
  const isBuildermapsPath = window.location.pathname.startsWith("/buildermaps");

  if (!isNetStaticDev || !isBuildermapsPath) {
    return null;
  }

  let filename: string;

  // Check if it's a net-static-dev.chainbasehq.com/public/buildermaps/imgs/ URL
  const productionPattern =
    /^https?:\/\/net-static-dev\.chainbasehq\.com\/public\/buildermaps\/imgs\/(.+)$/i;
  const productionMatch = imageUrl.match(productionPattern);

  if (productionMatch) {
    filename = productionMatch[1];
  } else if (imageUrl.startsWith("/imgs/")) {
    // It's a relative path like /imgs/alphakek.jpg
    filename = imageUrl.replace("/imgs/", "");
  } else {
    return null;
  }

  // Hardcoded localhost:8080
  return `http://localhost:8080/imgs/${filename}`;
}
