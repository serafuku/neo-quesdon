export async function register() {
  if (process.env.NODE_ENV === 'production') {
    const qs = await import('@/_service/queue/queueService');
    qs.QueueService.get();

    const env_arr = ['REDIS_HOST', 'REDIS_PORT', 'WEB_URL', 'DATABASE_URL', 'JWT_SECRET', 'NOTI_TOKEN', 'NOTI_HOST'];
    env_arr.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`ENV ${key} are not set`);
      }
    });
  }
}
