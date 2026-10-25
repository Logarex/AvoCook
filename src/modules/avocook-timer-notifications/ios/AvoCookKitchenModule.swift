import ExpoModulesCore
import Foundation
import UserNotifications
import Speech
import AVFoundation
public class AvoCookKitchenModule: Module {
  private static weak var active: AvoCookKitchenModule?
  private static var pendingStockOpen = false
  public static func openStockReminder() {
    pendingStockOpen = true
    active?.sendEvent("stockReminderOpen", [:])
  }
  private var engine: AVAudioEngine?
  private var task: SFSpeechRecognitionTask?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var listening = false
  private var session = 0

  public func definition() -> ModuleDefinition {
    Name("AvoCookKitchen")
    Events("voiceResult", "voiceError", "stockReminderOpen")
    OnCreate { Self.active = self }
    AsyncFunction("consumeStockReminderOpen") { () -> Bool in
      let pending = Self.pendingStockOpen
      Self.pendingStockOpen = false
      return pending
    }.runOnQueue(.main)

    AsyncFunction("voiceAvailable") { (language: String) -> Bool in
      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) else { return false }
      return recognizer.isAvailable && recognizer.supportsOnDeviceRecognition
    }
    AsyncFunction("startVoice") { (language: String, promise: Promise) in
      let requestedSession = self.session
      SFSpeechRecognizer.requestAuthorization { status in
        guard status == .authorized else { promise.resolve(false); return }
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          DispatchQueue.main.async {
            guard granted, self.session == requestedSession else { promise.resolve(false); return }
            self.startVoice(language: language, promise: promise)
          }
        }
      }
    }.runOnQueue(.main)
    AsyncFunction("stopVoice") {
      self.stopVoice()
    }.runOnQueue(.main)
    AsyncFunction("requestReminderPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
        if let error { promise.reject("ERR_REMINDER_PERMISSION", error.localizedDescription) }
        else { promise.resolve(granted) }
      }
    }
    AsyncFunction("replaceStockReminders") { (json: String, promise: Promise) in
      self.replaceReminders(json: json, promise: promise)
    }
    OnDestroy { if Self.active === self { Self.active = nil }; DispatchQueue.main.async { self.stopVoice() } }
    OnAppEntersBackground { DispatchQueue.main.async { self.stopVoice() } }
  }

  private func startVoice(language: String, promise: Promise) {
    stopVoice()
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)),
      recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else { promise.resolve(false); return }
    do {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audio.setActive(true)
      let engine = AVAudioEngine()
      let input = engine.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0 && format.channelCount > 0 else { stopVoice(); promise.resolve(false); return }
      let request = SFSpeechAudioBufferRecognitionRequest()
      request.requiresOnDeviceRecognition = true
      request.shouldReportPartialResults = false
      self.engine = engine
      self.request = request
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
      listening = true
      let session = self.session
      task = recognizer.recognitionTask(with: request) { result, error in
        DispatchQueue.main.async {
          guard self.listening && self.session == session else { return }
          if let result, result.isFinal {
            let text = result.bestTranscription.formattedString
            self.stopVoice()
            self.sendEvent("voiceResult", ["text": text])
          } else if let error {
            self.stopVoice()
            let speechError = error as NSError
            if speechError.domain == "kAFAssistantErrorDomain" && speechError.code == 1110 {
              self.sendEvent("voiceResult", ["text": ""])
            } else {
              self.sendEvent("voiceError", [:])
            }
          }
        }
      }
      engine.prepare()
      try engine.start()
      promise.resolve(true)
    } catch {
      stopVoice()
      promise.resolve(false)
    }
  }

  private func stopVoice() {
    session += 1
    listening = false
    engine?.stop()
    if engine != nil { engine?.inputNode.removeTap(onBus: 0) }
    request?.endAudio()
    task?.cancel()
    task = nil
    request = nil
    engine = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  private func replaceReminders(json: String, promise: Promise) {
    guard let data = json.data(using: .utf8),
      let entries = try? JSONSerialization.jsonObject(with: data) as? [[String: String]], entries.count <= 20 else {
      promise.reject("ERR_REMINDERS", "Invalid reminder plan"); return
    }
    let center = UNUserNotificationCenter.current()
    let formatter = ISO8601DateFormatter()
    var requests: [UNNotificationRequest] = []
    for entry in entries {
      guard let id = entry["id"], let title = entry["title"], let body = entry["body"],
        let rawDate = entry["date"], let date = formatter.date(from: rawDate), date > Date() else {
        promise.reject("ERR_REMINDERS", "Invalid reminder date"); return
      }
      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body
      content.sound = .default
      let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date), repeats: false)
      requests.append(UNNotificationRequest(identifier: "avocook-stock:\(id)", content: content, trigger: trigger))
    }
    center.getNotificationSettings { settings in
      guard requests.isEmpty || [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else {
        promise.reject("ERR_REMINDERS", "Notifications are disabled"); return
      }
      center.getPendingNotificationRequests { pending in
      let otherCount = pending.filter { !$0.identifier.hasPrefix("avocook-stock:") }.count
      guard requests.count + otherCount <= 64 else {
        promise.reject("ERR_REMINDERS", "Notification capacity exceeded"); return
      }
      center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix("avocook-stock:") })
      let group = DispatchGroup()
      let lock = NSLock()
      var failed = false
      for request in requests {
        group.enter()
        center.add(request) { error in
          if error != nil { lock.lock(); failed = true; lock.unlock() }
          group.leave()
        }
      }
      group.notify(queue: .main) {
        if failed { promise.reject("ERR_REMINDERS", "Could not schedule reminders") }
        else { promise.resolve(true) }
      }
    }
    }
  }
}
