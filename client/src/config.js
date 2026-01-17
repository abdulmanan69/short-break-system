// Automatically determine the backend URL based on the current browser address
const getBackendUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

export const API_URL = getBackendUrl();
export const SOCKET_URL = getBackendUrl();