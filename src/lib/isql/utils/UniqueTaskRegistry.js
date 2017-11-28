import UniqueTask from './UniqueTask';

function taskCompletionHandler(uniqTask) {
  let id = uniqTask.getId();
  delete this._registry[id];
}

export default class UniqueTaskRegistry {
  constructor(name, {cacheResponseTime = 0} = {cacheResponseTime: 0}) {
    this._name = name;
    this._registry = {};
    this._onTaskEnded = taskCompletionHandler.bind(this);
    this._options = {
      cacheResponseTime: cacheResponseTime
    };
  }

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