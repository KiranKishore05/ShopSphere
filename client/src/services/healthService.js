import api from '../lib/axios';

export const checkHealth = async () => {
  const startTime = performance.now();
  try {
    const response = await api.get('/health');
    const latency = Math.round(performance.now() - startTime);
    return {
      connected: true,
      latency,
      data: response.data || response,
      error: null
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      connected: false,
      latency,
      data: null,
      error: error.message || 'Server connection unreachable'
    };
  }
};
