const { View } = require('@nativescript/core');

class ProjectPasteControl extends View {
  constructor(textView) {
    super();
    this.textView = textView;
    this.height = 44;
    this.width = 180;
    this.marginTop = 10;
    this.horizontalAlignment = 'left';
  }

  createNativeView() {
    return NSPreviewPasteView.alloc().initWithFrame(CGRectZero);
  }

  initNativeView() {
    super.initNativeView();
    const editor = this.textView;
    const owner = new WeakRef(this);
    this.nativeViewProtected.onPaste = (text) => { editor.text = String(text); };
    this.nativeViewProtected.onFailure = (message) => {
      const view = owner.deref();
      if (view) view.notify({ eventName: 'pasteError', object: view, message: String(message) });
    };
  }

  disposeNativeView() {
    this.nativeViewProtected.onPaste = null;
    this.nativeViewProtected.onFailure = null;
    super.disposeNativeView();
  }
}

module.exports = { ProjectPasteControl };
