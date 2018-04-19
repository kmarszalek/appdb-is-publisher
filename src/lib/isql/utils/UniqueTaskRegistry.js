import UniqueTask from './UniqueTask';

function taskCompletionHandler(uniqTask) {
  let id = uniqTask.getId();
  delete this._registry[id];
}

/**
 * Creates and handles tasks. Ensures that only one task is executed for the given id.
 * If a new task is registered and there is already one with the same id running, then
 * the registry will return the existing one and not create a new one.
 *
 * NOTE: This is used for not creating dublicate query requests to the backend.
 */
class UniqueTaskRegistry {
  constructor(name, {cacheResponseTime = 0} = {cacheResponseTime: 0}) {
    this._name = name;
    this._registry = {};
    this._onTaskEnded = taskCompletionHandler.bind(this);
    this._options = {
      cacheResponseTime: cacheResponseTime
    };
  }
  /**
   * Register, start and return a subscription handler for a new task.
   * If there is already a same task running, it returns the subscription
   * handler of the existing one.
   *
   * @param   {string}    taskId      A unique identifier for the task. Usually an MD5 hash.
   * @param   {function}  taskCaller  The function that executes the given task.
   *
   * @returns {Promise}               Resolves with the task result.
   */
  register(taskId, taskCaller) {
    let task = new UniqueTask({
      taskId, taskCaller,
      onTaskEnded: this._onTaskEnded,
      cacheResponseTime: this._options.cacheResponseTime
    });
    let id = task.getId();
    if (!this._registry[id]) {
      this._registry[id] = task;
      this._registry[id].start();
    }

    return this._registry[id].subscribe();
  }
}

export default UniqueTaskRegistry;