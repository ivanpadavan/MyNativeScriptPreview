const core = require('@nativescript/core');
const { createHome } = require('./ui/home');

// Keep a real native reference in the host's source/metadata. Guests are not
// present when the shell is compiled and cannot drive native symbol discovery.
console.info('BackgroundTasks metadata:', typeof BGTaskScheduler !== 'undefined');

core.Application.run({
  create() {
    const frame = new core.Frame();
    frame.navigate({ create: createHome });
    return frame;
  },
});
