const { View } = require('@nativescript/core');

class ProjectPasteControl extends View {
  constructor(textView) {
    super();
    this.textView = textView;
    this.height = 44;
    this.marginTop = 10;
    this.horizontalAlignment = 'left';
  }

  createNativeView() {
    const control = UIPasteControl.alloc().init();
    control.accessibilityIdentifier = 'paste-project';
    control.accessibilityLabel = 'Вставить проект';
    control.isAccessibilityElement = true;
    return control;
  }

  onLoaded() {
    super.onLoaded();
    this.nativeViewProtected.target = this.textView.ios;
  }

  disposeNativeView() {
    this.nativeViewProtected.target = null;
    super.disposeNativeView();
  }
}

module.exports = { ProjectPasteControl };
