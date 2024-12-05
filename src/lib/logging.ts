export const logToFile = (message: string) => {
  // In browser/client environment, just use console.log
  console.log(`[${new Date().toISOString()}] ${message}`);
};
