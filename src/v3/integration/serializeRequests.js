export function createRequestSerializer() {
  let requestQueue = Promise.resolve();
  return (task) => {
    const result = requestQueue.then(task, task);
    requestQueue = result.catch(() => undefined);
    return result;
  };
}
