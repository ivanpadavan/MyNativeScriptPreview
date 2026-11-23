import XCTest
import UIKit

final class PreviewUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "org.ivanpadavan.nativescriptpreview")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["add-project"].waitForExistence(timeout: 20))
    }

    override func tearDownWithError() throws {
        if testRun?.hasSucceeded == false {
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "failure-screen"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }
    }

    private func fixture(_ name: String = "gpu-check") throws -> String {
        let url = try XCTUnwrap(Bundle(for: PreviewUITests.self).url(forResource: name, withExtension: "preview.txt"))
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func packet(name: String, id: String, source: String) throws -> String {
        let body: [String: Any] = ["format": "ns-preview/1", "name": name, "id": id, "entry": "main.cjs",
                                   "files": ["main.cjs": ["encoding": "utf8", "data": source]]]
        return try XCTUnwrap(String(data: JSONSerialization.data(withJSONObject: body), encoding: .utf8))
    }

    private func paste(_ text: String) {
        if !app.textViews["project-text"].exists { app.buttons["add-project"].tap() }
        let editor = app.textViews["project-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        XCUIApplication(bundleIdentifier: Bundle.main.bundleIdentifier!).activate()
        UIPasteboard.general.string = text
        XCTAssertEqual(UIPasteboard.general.string, text)
        app.activate()
        let paste = app.descendants(matching: .any).matching(identifier: "paste-project").firstMatch
        XCTAssertTrue(paste.waitForExistence(timeout: 5))
        paste.tap()
        let pasted = NSPredicate { _, _ in
            let value = editor.value as? String ?? ""
            return text.count <= 12000 ? value == text : value.hasPrefix(String(text.prefix(500)))
        }
        expectation(for: pasted, evaluatedWith: editor)
        waitForExpectations(timeout: 10)
    }

    private func importPackage(_ text: String) {
        paste(text)
        app.buttons["import-project"].tap()
        let update = app.buttons["Обновить"]
        if update.waitForExistence(timeout: 2) { update.tap() }
        let ready = NSPredicate { _, _ in self.app.buttons["add-project"].isHittable && !self.app.textViews["project-text"].exists }
        expectation(for: ready, evaluatedWith: app)
        waitForExpectations(timeout: 10)
    }

    private func open(_ name: String) {
        let button = app.buttons["open-app-\(name)"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        if !button.isHittable { app.swipeUp() }
        button.tap()
    }

    private func returnToLibrary() {
        let bar = app.navigationBars.allElementsBoundByIndex.last!
        bar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).press(
            forDuration: 0.1,
            thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.93)))
        let closed = NSPredicate { _, _ in self.app.buttons["add-project"].isHittable }
        expectation(for: closed, evaluatedWith: app)
        waitForExpectations(timeout: 5)
    }

    private func leaveImport() {
        app.navigationBars.buttons["Preview"].tap()
        XCTAssertTrue(app.buttons["add-project"].waitForExistence(timeout: 5))
    }

    private func checkGPU() {
        XCTAssertTrue(app.buttons["check-gpu"].waitForExistence(timeout: 10))
        app.buttons["check-gpu"].tap()
        let alert = app.alerts["GPU"]
        XCTAssertTrue(alert.waitForExistence(timeout: 5))
        let value = alert.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "Background GPU: (true|false)")).firstMatch
        XCTAssertTrue(value.exists, "Expected the actual native API resource mask")
        print("Native GPU response: \(value.label)")
        XCTAssertFalse(alert.staticTexts["API недоступен в этой версии Preview или iOS"].exists)
        alert.buttons["OK"].tap()
    }

    private func assertError(_ text: String) {
        let error = app.staticTexts["import-error"]
        let matches = NSPredicate { _, _ in error.exists && error.label.contains(text) }
        expectation(for: matches, evaluatedWith: error)
        waitForExpectations(timeout: 5)
    }

    func testRealPasteAndNativeGPUResult() throws {
        XCTAssertFalse(app.buttons["check-gpu"].exists)
        importPackage(try fixture())
        open("GPU Check")
        checkGPU()
        XCTAssertFalse(app.buttons["Оболочка"].exists, "Launcher must not inject guest navigation buttons")
        returnToLibrary()
        open("GPU Check")
        checkGPU()
        returnToLibrary()
    }

    func testLibraryAndPerAppDataSurviveRestart() throws {
        importPackage(try fixture())
        importPackage(try fixture("tap-counter"))
        XCTAssertTrue(app.buttons["open-app-GPU Check"].exists)
        open("Tap Counter")
        XCTAssertTrue(app.buttons["counter-reset"].waitForExistence(timeout: 10))
        app.buttons["counter-reset"].tap()
        for _ in 0..<3 { app.buttons["counter-increment"].tap() }
        XCTAssertEqual(app.staticTexts["counter-value"].label, "3")
        returnToLibrary()
        app.terminate()
        XCUIApplication(bundleIdentifier: Bundle.main.bundleIdentifier!).activate()
        UIPasteboard.general.string = ""
        app.launch()
        XCTAssertTrue(app.buttons["add-project"].waitForExistence(timeout: 15))
        open("Tap Counter")
        XCTAssertTrue(app.staticTexts["counter-value"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.staticTexts["counter-value"].label, "3")
        returnToLibrary()
        // Updating the same package ID keeps its private data directory.
        importPackage(try fixture("tap-counter"))
        open("Tap Counter")
        XCTAssertTrue(app.staticTexts["counter-value"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.staticTexts["counter-value"].label, "3")
        returnToLibrary()
    }

    func testInvalidImportKeepsPreviousWorkingProject() throws {
        importPackage(try fixture())
        paste("{ broken JSON")
        app.buttons["import-project"].tap()
        assertError("JSON")
        leaveImport()
        open("GPU Check")
        checkGPU()
        returnToLibrary()
    }

    func testGuestSyntaxAndUnavailableModuleErrors() throws {
        let bad = try packet(name: "Broken", id: "test.broken", source: "module.exports = { broken: ;")
        paste(bad)
        app.buttons["import-project"].tap()
        assertError("main.cjs")
        let unknown = try packet(name: "Unknown", id: "test.unknown", source: "require('not-in-shell');")
        paste(unknown)
        app.buttons["import-project"].tap()
        assertError("Модуль не включён")
        leaveImport()
        XCTAssertFalse(app.buttons["open-app-Broken"].exists)
        XCTAssertFalse(app.buttons["open-app-Unknown"].exists)
    }

    func testImportPreviewDoesNotOpenKeyboard() throws {
        paste(try fixture())
        app.textViews["project-text"].tap()
        XCTAssertFalse(app.keyboards.firstMatch.exists)
        XCTAssertTrue(app.buttons["import-project"].isHittable)
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "paste-project").firstMatch.isHittable)
        leaveImport()
    }

    func testAllDeclaredPluginModulesLoadOnIOS() throws {
        let source = """
        const {Page,StackLayout,Label,Button}=require('@nativescript/core');
        exports.createPage=function(ctx){
          for(const name of ctx.packages){const module=require(name);if(!module)throw new Error(name);}
          const page=new Page();page.actionBar.title='Plugin Catalog';const box=new StackLayout();
          const result=new Label();result.text='Plugins: '+ctx.packages.length;result.automationText='plugin-catalog-result';box.addChild(result);
          const close=new Button();close.text='Закрыть';close.automationText='close-probe';close.on('tap',()=>ctx.close());box.addChild(close);
          page.content=box;return page;
        };
        """
        importPackage(try packet(name: "Plugin Probe", id: "test.plugins", source: source))
        open("Plugin Probe")
        XCTAssertTrue(app.staticTexts["plugin-catalog-result"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.staticTexts["plugin-catalog-result"].label, "Plugins: 25")
        app.buttons["close-probe"].tap()
        XCTAssertTrue(app.buttons["add-project"].waitForExistence(timeout: 5))
    }

    func testCanvasRendersAndChangesPalette() throws {
        importPackage(try fixture("canvas"))
        open("Particle Canvas")
        let status = app.staticTexts["canvas-render-result"]
        let ready = NSPredicate { _, _ in status.exists && status.label.hasPrefix("Canvas: ready") }
        expectation(for: ready, evaluatedWith: status)
        waitForExpectations(timeout: 15)
        app.buttons["canvas-theme"].tap()
        XCTAssertTrue(status.label.contains("палитра 2"))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Native Canvas 2D with readback and palette interaction"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        returnToLibrary()
    }

    func testLocationWatchReceivesSimulatedPositionAndStops() throws {
        importPackage(try fixture("background-location"))
        open("Location Journal")
        XCTAssertTrue(app.buttons["location-start"].waitForExistence(timeout: 10))
        app.buttons["location-start"].tap()
        let journal = app.staticTexts["location-journal"]
        let located = NSPredicate { _, _ in journal.exists && journal.label.contains("37.33490") }
        expectation(for: located, evaluatedWith: journal)
        waitForExpectations(timeout: 25)
        app.buttons["location-stop"].tap()
        XCTAssertEqual(app.staticTexts["location-status"].label, "Геолокация остановлена")
        returnToLibrary()
    }

    func testLargePacketIsKeptBeyondTruncatedPreview() throws {
        let source = "/*" + String(repeating: "padding ", count: 2500) + "*/" +
            "exports.createPage=function(){const {Page,Label}=require('@nativescript/core');const p=new Page();p.actionBar.title='Large';const l=new Label();l.text='Complete packet';l.automationText='large-packet-result';p.content=l;return p;};"
        importPackage(try packet(name: "Large Packet", id: "test.large", source: source))
        open("Large Packet")
        XCTAssertTrue(app.staticTexts["large-packet-result"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.staticTexts["large-packet-result"].label, "Complete packet")
        returnToLibrary()
    }

    func testDeleteRemovesAppAcrossRestart() throws {
        let source = "exports.createPage=function(){return new (require('@nativescript/core').Page)();};"
        importPackage(try packet(name: "Disposable", id: "test.disposable", source: source))
        let menu = app.buttons["delete-app-Disposable"]
        if !menu.isHittable { app.swipeUp() }
        menu.tap()
        app.alerts.buttons["Удалить"].tap()
        let gone = NSPredicate { _, _ in !self.app.buttons["open-app-Disposable"].exists }
        expectation(for: gone, evaluatedWith: app)
        waitForExpectations(timeout: 5)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["add-project"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["open-app-Disposable"].exists)
    }
}
