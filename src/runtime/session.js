const { Frame, Page } = require('@nativescript/core');
const { createGuest } = require('./loader');
const storage = require('./storage');

// Each launch gets its own native navigation stack. The launcher adds no
// ActionItems to guest pages. iOS sheet dismissal closes the whole session,
// including pages pushed by the guest, and disposes resources once.
async function openSession(presenter, record, onClose) {
  const { raw, project } = await storage.readApp(record.id);
  const directory = await storage.stage(project);
  const frame = new Frame();
  let guest;
  let disposed = false;
  const close = () => {
    if (disposed) return;
    disposed = true;
    if (guest) guest.dispose();
    storage.removeStage(directory).catch(console.error);
    if (onClose) onClose();
  };
  try {
    guest = createGuest(project, directory, {
      appId: record.id, dataPath: storage.dataDirectory(record.id), close: () => frame.closeModal(),
    });
    guest.page.once(Page.loadedEvent, () => storage.markOpened(record.id).catch(console.error));
    frame.navigate({ create: () => guest.page });
    frame.on('shownModally', () => {
      const sheet = frame.ios.controller.sheetPresentationController;
      if (sheet) sheet.prefersGrabberVisible = true;
    });
    presenter.showModal(frame, {
      fullscreen: false, animated: true, ios: { presentationStyle: 1 }, // UIKit PageSheet
      closeCallback: close,
    });
  } catch (error) {
    close();
    throw error;
  }
}

module.exports = { openSession };
