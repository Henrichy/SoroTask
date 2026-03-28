function createConcurrencyLimit(concurrency) {
  let activeCount = 0;
  const queue = [];
  const clearedError = new Error('Queue cleared');
  clearedError.name = 'QueueClearedError';

  const next = () => {
    if (activeCount >= concurrency || queue.length === 0) {
      return;
    }

    const task = queue.shift();
    activeCount++;

    Promise.resolve()
      .then(task.fn)
      .then(task.resolve, task.reject)
      .finally(() => {
        activeCount--;
        next();
      });
  };

  const limit = (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });

  limit.clearQueue = () => {
    while (queue.length > 0) {
      const task = queue.shift();
      task.reject(clearedError);
    }
  };

  return limit;
}

module.exports = { createConcurrencyLimit };
