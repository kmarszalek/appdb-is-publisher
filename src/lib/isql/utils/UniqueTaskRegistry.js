import UniqueTask from './UniqueTask';

function taskCompletionHandler(uniqTask) {
  let id = uniqTask.getId();
  delete this._registry[id];
}

export default class UniqueTaskRegistry {
  constructor(name) {
    this._name = name;
    this._registry = {};
    this._onTaskEnded = taskCompletionHandler.bind(this);
  }

  register(taskId, taskCaller) {
    let task = new UniqueTask({taskId, taskCaller, onTaskEnded: this._onTaskEnded});
    let id = task.getId();
    if (!this._registry[id]) {
      this._registry[id] = task;
      this._registry[id].start();
    }

    return this._registry[id].subscribe();
  }
}