// Health Check Netlify Function
exports.handler = async (event, context) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "voice-notes-pro",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : "unknown",
    memory: process.memoryUsage ? {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    } : "unknown"
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
    body: JSON.stringify(healthStatus, null, 2)
  };
};
