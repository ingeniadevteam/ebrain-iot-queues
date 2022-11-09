"use strict";

const Queue = require('better-queue');

module.exports = (app) => {
    // The MQTT topic that this device will publish data to.
    let mqttTopic = `v1/gateway/telemetry`;
    if (process.env.GATEWAY === 'false') {
      mqttTopic = `v1/devices/me/telemetry`;
    }

    app['mqtt-thingsboard'].queue = new Queue( (payload, cb) => {
        // Publish "payload" to the MQTT topic. qos=1 means at least once delivery.
        // Cloud IoT Core also supports qos=0 for at most once delivery.
        
        if (process.env.NODE_ENV === 'development' && process.env.DEVELOPMENT_PUBLISH === 'false') {
          app.logger.debug(`publication is not enabled in dev mode DEVELOPMENT_PUBLISH=false`);
          cb(null, payload);
          return;
        }

        app.logger.debug(`mqtt publishing message to ${mqttTopic}`);

        app['mqtt-thingsboard'].client.publish(mqttTopic, JSON.stringify(
            payload
          ), {qos: 1}, err => {
            if (!err) {
              cb(null, payload);
            } else {
              cb(err.message, '❗️');
            }
        });
    }, {
      store: {
        type: 'sqlite',
        path: `${app.configDir}/mqtt-thingsboard.sqlite`
      },
      // will delay processing between tasks
      afterProcessDelay: 500,
      precondition: function (cb) {
        if (app['mqtt-thingsboard'].ready) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
      // If we go offline, retry every 10s
      preconditionRetryTimeout: 10*1000
    });

    app['mqtt-thingsboard'].queue.on('task_finish', function (taskId, payload) {
      // Handle finished payload
      app.logger.debug(`mqtt payload ${taskId} done`);
    });

    app['mqtt-thingsboard'].queue.on('task_failed', function (taskId, errorMessage) {
      // Handle error
      app.logger.debug(`mqtt payload ${taskId} failed: ${errorMessage}`);
      app.logger.debug(`mqtt stats ${app['mqtt-thingsboard'].queue.getStats()}`, );
    });
};
