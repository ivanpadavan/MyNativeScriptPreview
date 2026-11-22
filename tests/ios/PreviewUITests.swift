import XCTest
import UIKit

final class PreviewUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "org.ivanpadavan.nativescriptpreview")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["run-project"].waitForExistence(timeout: 20))
    }

    override func tearDownWithError() throws {
        if testRun?.hasSucceeded == false {
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "failure-screen"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }
    }

    private func fixture() throws -> String {
        let bundle = Bundle(for: PreviewUITests.self)
        let url = try XCTUnwrap(bundle.url(forResource: "gpu-check", withExtension: "preview.txt"))
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func paste(_ text: String, withKeyboard: Bool = false) {
        app.buttons["clear-project-text"].tap()
        // This is the real system pasteboard, written by the separate test runner.
        // No launch-argument importer, fixture URL, or guest bypass is used.
        let runnerID = Bundle.main.bundleIdentifier!
        XCUIApplication(bundleIdentifier: runnerID).activate()
        UIPasteboard.general.string = text
        XCTAssertEqual(UIPasteboard.general.string, text)
        app.activate()
        if withKeyboard {
            app.textViews["project-text"].tap()
            XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        }
        let paste = app.descendants(matching: .any).matching(identifier: "paste-project").firstMatch
        XCTAssertTrue(paste.waitForExistence(timeout: 5))
        if withKeyboard {
            XCTAssertLessThanOrEqual(paste.frame.maxY, app.keyboards.firstMatch.frame.minY)
        }
        paste.tap()
        let editor = app.textViews["project-text"]
        print("Pasted text prefix: \((editor.value as? String)?.prefix(160) ?? "<nil>")")
        let pasted = NSPredicate { _, _ in (editor.value as? String) == text }
        expectation(for: pasted, evaluatedWith: editor)
        waitForExpectations(timeout: 10)
    }

    private func runFixture() throws {
        paste(try fixture())
        app.buttons["run-project"].tap()
        XCTAssertTrue(app.buttons["check-gpu"].waitForExistence(timeout: 10))
    }

    private func checkGPU() {
        app.buttons["check-gpu"].tap()
        let alert = app.alerts["GPU"]
        XCTAssertTrue(alert.waitForExistence(timeout: 5))
        let value = alert.staticTexts.matching(NSPredicate(
            format: "label MATCHES %@", "Background GPU: (true|false)"
        )).firstMatch
        // Missing SDK metadata on our iOS 26+ runner must not pass via fallback.
        XCTAssertTrue(value.exists, "Expected the actual native API's numeric resource mask")
        print("Native GPU response: \(value.label)")
        XCTAssertFalse(alert.staticTexts["API недоступен в этой версии Preview или iOS"].exists)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Actual BackgroundTasks API result"
        attachment.lifetime = .keepAlways
        add(attachment)
        alert.buttons["OK"].tap()
        XCTAssertFalse(alert.exists)
    }

    private func returnToShell() {
        app.buttons["Оболочка"].tap()
        XCTAssertTrue(app.buttons["run-project"].waitForExistence(timeout: 5))
    }

    private func assertImportError(containing text: String) {
        let error = app.staticTexts["import-error"]
        XCTAssertTrue(error.waitForExistence(timeout: 5))
        let matches = NSPredicate { _, _ in error.label.contains(text) }
        expectation(for: matches, evaluatedWith: error)
        waitForExpectations(timeout: 5)
        XCTAssertFalse(app.buttons["check-gpu"].exists)
    }

    func testRealPasteAndNativeGPUResult() throws {
        XCTAssertFalse(app.buttons["check-gpu"].exists, "Example must not be built into the shell")
        try runFixture()
        checkGPU()
        returnToShell()
        try runFixture()
        checkGPU()
        returnToShell()
    }

    func testPasteAndRunRemainAboveKeyboard() throws {
        paste(try fixture(), withKeyboard: true)
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.exists)
        let run = app.buttons["run-project"]
        XCTAssertTrue(run.isHittable)
        XCTAssertLessThanOrEqual(run.frame.maxY, keyboard.frame.minY,
                                 "Run must be above the keyboard without scrolling")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Paste and Run above open keyboard"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        run.tap()
        XCTAssertTrue(app.buttons["check-gpu"].waitForExistence(timeout: 10))
        checkGPU()
        returnToShell()

        app.textViews["project-text"].tap()
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
        app.buttons["dismiss-keyboard"].tap()
        let hidden = NSPredicate { _, _ in !keyboard.exists }
        expectation(for: hidden, evaluatedWith: app)
        waitForExpectations(timeout: 5)
    }

    func testSavedProjectAfterProcessRestartWithoutDevServer() throws {
        try runFixture()
        checkGPU()
        returnToShell()
        app.terminate()
        XCUIApplication(bundleIdentifier: Bundle.main.bundleIdentifier!).activate()
        UIPasteboard.general.string = ""
        XCTAssertEqual(UIPasteboard.general.string ?? "", "")
        app.launch()
        let saved = app.buttons["open-saved-project"]
        XCTAssertTrue(saved.waitForExistence(timeout: 10))
        let enabled = NSPredicate(format: "enabled == true")
        expectation(for: enabled, evaluatedWith: saved)
        waitForExpectations(timeout: 5)
        saved.tap()
        XCTAssertTrue(app.buttons["check-gpu"].waitForExistence(timeout: 10))
        checkGPU()
        returnToShell()
    }

    func testInvalidImportKeepsPreviousWorkingProject() throws {
        try runFixture()
        returnToShell()
        paste("{ broken JSON")
        app.buttons["run-project"].tap()
        assertImportError(containing: "JSON")
        app.buttons["open-saved-project"].tap()
        XCTAssertTrue(app.buttons["check-gpu"].waitForExistence(timeout: 5))
        checkGPU()
        returnToShell()
    }

    func testGuestSyntaxAndUnavailableModuleErrors() throws {
        let bytes = try XCTUnwrap(try fixture().data(using: .utf8))
        var packet = try XCTUnwrap(JSONSerialization.jsonObject(with: bytes) as? [String: Any])
        var files = try XCTUnwrap(packet["files"] as? [String: Any])
        files["entry.cjs"] = ["encoding": "utf8", "data": "module.exports = { broken: ;"]
        packet["files"] = files
        var raw = try XCTUnwrap(String(data: JSONSerialization.data(withJSONObject: packet), encoding: .utf8))
        paste(raw)
        app.buttons["run-project"].tap()
        assertImportError(containing: "entry.cjs")

        files["entry.cjs"] = ["encoding": "utf8", "data": "require('not-in-shell');"]
        packet["files"] = files
        raw = try XCTUnwrap(String(data: JSONSerialization.data(withJSONObject: packet), encoding: .utf8))
        paste(raw)
        app.buttons["run-project"].tap()
        assertImportError(containing: "Модуль не включён")
    }
}
