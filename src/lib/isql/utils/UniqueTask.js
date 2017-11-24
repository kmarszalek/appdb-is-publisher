import _ from 'lodash';

class UniqueTask {
  constructor({id, taskCaller, onTaskEnded}) {
    this._id = _.trim(_.isPlainObject(id) ? JSON.stringify(id) : id);
    this._taskCaller = taskCaller;
    this._promise = Promise.resolve();
    this._subscribers = [];
    this._taskStatus = UniqueTask.STATUS_IDLE;
    this._taskResultStatus = null;
    this._taskResult = null;
    this._onTaskEnded = onTaskEnded;
  }

  getTaskStatus() {
    return this._taskStatus;
  }

  getTaskResultStatus() {
    return this._taskResultStatus;
  }

  getTaskResult() {
    let resultStatus = this.getTaskResultStatus();
    switch(resultStatus) {
      case UniqueTask.TASK_SUCCESS:
        return Promise.resolve(this._taskResult);
      case UniqueTask.TASK_ERROR:
        return Promise.reject(this._taskResult);
    }
  }

  getId() {
    return this._id;
  }

  getTaskCaller() {
    return this._taskCaller;
  }

  _resolveHandler(res) {
    this._taskResultStatus = UniqueTask.TASK_SUCCESS;
    this._fullfilledHandler();
    this._subscribers.forEach(subscriber => subscribe.onResolve(res));
  }

  _rejectHandler(err) {
    this._taskResultStatus = UniqueTask.TASK_ERROR;
    this._fullfilledHandler();
    this._subscribers.forEach(subscriber => subscribe.onReject(err));
  }

  _fullfilledHandler() {
    this._taskStatus = UniqueTask.STATUS_ENDED;
    this._onTaskEnded(this);
  }

  start() {
    if (this._taskStatus !== UniqueTask.STATUS_RUNNING) {
      this._taskStatus = UniqueTask.STATUS_RUNNING;
      this.getTaskCaller().then(_resolveHandler.bind(this)).catch(_rejectHandler.bind(this));
    }
  }

  subscribe() {
    if (this.getTaskStatus() === UniqueTask.STATUS_ENDED) {
      return this.getTaskResponse();
    }

    let subscriber = {
      onResolve: (resolve) => (res) => resolve(res),
      onReject: (reject) => (err) => reject(err)
    };

    this._subscribers.push(subscriber);

    return new Promise(UniqueTask.SubscriberPromiseHandler.bind(subscriber));
  }
}

UniqueTask.STATUS_IDLE = 'idle';
UniqueTask.STATUS_RUNNING = 'running';
UniqueTask.STATUS_ENDED = 'ended';

UniqueTask.TASK_SUCCESS = 'success';
UniqueTask.TASK_ERROR = 'error';

UniqueTask.SubscriberPromiseHandler = function(resolve , reject) {
  this.onResolve = this.onResolve(resolve);
  this.onReject = this.onReject(reject);
};

export default UniqueTask;