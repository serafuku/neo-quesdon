export async function register() {
  if (process.env.NODE_ENV === 'production') {
    const qs = await import('@/api/_queue-service/queueService');
    qs.QueueService.get();
  }
}