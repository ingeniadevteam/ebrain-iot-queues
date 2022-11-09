"use strict";

const Queue = require('better-queue');

// Uploads telemetry data using 'v1/devices/me/telemetry' MQTT topic
function publishTelemetry() {
  data.temperature = genNextValue(data.temperature, minTemperature, maxTemperature);
  data.humidity = genNextValue(data.humidity, minHumidity, maxHumidity);
  client.publish('v1/devices/me/telemetry', JSON.stringify(data));
}

module.exports = (app) => {
    app['modbus'].queue = new Queue( (payload, cb) => {
        app.logger.debug(`modbus writing data...`);
        setTimeout(() => { cb(null, payload); }, 250);
    }, {
      store: {
        type: 'sqlite',
        path: `${app.configDir}/modbus.sqlite`
      },
      // will delay processing between tasks
      afterProcessDelay: 500,
      precondition: function (cb) {
        if (app['modbus'].ready) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
      // If we go offline, retry every 10s
      preconditionRetryTimeout: 10*1000
    });

    app['modbus'].queue.on('task_finish', function (taskId, payload) {
      // Handle finished payload
      app.logger.debug(`modbus ${taskId} done`);
    });

    app['modbus'].queue.on('task_failed', function (taskId, errorMessage) {
      // Handle error
      app.logger.debug(`modbus ${taskId} failed: ${errorMessage}`);
      app.logger.debug(`modbus stats ${app['modbus'].queue.getStats()}`, );
    });
};
