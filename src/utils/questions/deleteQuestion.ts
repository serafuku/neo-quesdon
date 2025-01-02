export async function deleteQuestion(id: number, onResNotOk?: (code: number, res: Response) => void) {
  const res = await fetch(`/api/db/questions/${id}`, {
    method: 'DELETE',
    cache: 'no-cache',
  });
  if (!res.ok) {
    if (onResNotOk) {
      onResNotOk(res.status, res);
    }
  }
}
