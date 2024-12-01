export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { QueueService } = await import('@/api/_queue-service/queueService');
    QueueService.get();
  }
}
