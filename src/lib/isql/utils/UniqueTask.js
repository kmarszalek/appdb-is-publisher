import _ from 'lodash';

class UniqueTask {
  constructor({taskId, taskCaller, onTaskEnded, cacheResponseTime = 0}) {
    this._id = _.trim(_.isPlainObject(taskId) ? JSON.stringify(taskId) : taskId);
    this._taskCaller = taskCaller;
    this._promise = Promise.resolve();
    this._subscribers = [];
    this._taskStatus = UniqueTask.STATUS_IDLE;
    this._taskResultStatus = null;
    this._taskResult = null;
    this._onTaskEnded = onTaskEnded;
    this._cacheResponseTime = parseInt(cacheResponseTime) || 0;
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

  _execTask(taskCaller) {
    return new Promise((resolve, reject) => {
      try {
        let res = taskCaller();
        if (res && _.isFunction(res.then) && _.isFunction(res.catch)) {
          res.then(resolve).catch(reject);
        } else {
          resolve(res);
        }
      } catch (e) {
        if (res && _.isFunction(res.then) && _.isFunction(res.catch)) {
          res.catch(reject);
        } else {
          reject(e);
        }
      }
    });
    return this._taskCaller();
  }

  _resolveHandler(res) {
    this._taskResultStatus = UniqueTask.TASK_SUCCESS;
    this._taskResult = res;
    this._fullfilledHandler();
    this._subscribers.forEach(subscriber => subscriber.onResolve(res));
  }

  _rejectHandler(err) {
    this._taskResultStatus = UniqueTask.TASK_ERROR;
    this._taskResult = err;
    this._fullfilledHandler();
    this._subscribers.forEach(subscriber => subscriber.onReject(err));
  }

  _fullfilledHandler() {
    this._taskStatus = UniqueTask.STATUS_ENDED;
    let cacheFor = this.getCacheResponseTime();
    if (cacheFor > 0) {
      setTimeout(function() {this._onTaskEnded(this);}.bind(this), cacheFor);
    } else {
      this._onTaskEnded(this);
    }

  }

  getCacheResponseTime() {
    return this._cacheResponseTime;
  }

  start() {
    if (this._taskStatus !== UniqueTask.STATUS_RUNNING) {
      this._taskStatus = UniqueTask.STATUS_RUNNING;
      this._execTask(this.getTaskCaller()).then(this._resolveHandler.bind(this)).catch(this._rejectHandler.bind(this));
    }
  }

  subscribe() {
    if (this.getTaskStatus() === UniqueTask.STATUS_ENDED) {
      return this.getTaskResult();
    }

    let subscriber = {
      onResolve: (resolve) => (res) => resolve(res),
      onReject: (reject) => (err) => reject(err)
    };

    this._subscribers.push(subscriber);
    return new Promise((res, rej) => {
      subscriber.onResolve = subscriber.onResolve(res);
      subscriber.onReject = subscriber.onReject(rej);
    });
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