package app.avocook.timernotifications

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AvoCookKitchenModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private var session = 0
  private var pendingStockOpen = false
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AvoCookKitchen")
    Events("voiceResult", "voiceError", "stockReminderOpen")
    OnNewIntent { intent ->
      if (intent.getBooleanExtra("avocook.stockReminder", false)) {
        pendingStockOpen = true
        intent.removeExtra("avocook.stockReminder")
        sendEvent("stockReminderOpen", emptyMap<String, String>())
      }
    }
    AsyncFunction("consumeStockReminderOpen") {
      val intent = appContext.currentActivity?.intent
      val pending = pendingStockOpen || intent?.getBooleanExtra("avocook.stockReminder", false) == true
      pendingStockOpen = false
      intent?.removeExtra("avocook.stockReminder")
      pending
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("voiceAvailable") { _: String ->
      Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("startVoice") { language: String, promise: Promise ->
      stopVoice()
      if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(context) ||
        context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        promise.resolve(false)
      } else {
        try {
          val current = session
          val speech = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
          recognizer = speech
          speech.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
            override fun onError(error: Int) {
              if (session != current) return
              stopVoice()
              sendEvent("voiceError", emptyMap<String, String>())
            }
            override fun onResults(results: Bundle?) {
              if (session != current) return
              val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
              stopVoice()
              sendEvent("voiceResult", mapOf("text" to text))
            }
          })
          speech.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          })
          promise.resolve(true)
        } catch (_: Exception) { stopVoice(); promise.resolve(false) }
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stopVoice") { stopVoice() }.runOnQueue(Queues.MAIN)
    AsyncFunction("requestReminderPermission") { promise: Promise ->
      if (Build.VERSION.SDK_INT < 33) promise.resolve(true)
      else {
        val permissions = appContext.permissions
        if (permissions == null) promise.resolve(false)
        else permissions.askForPermissions(PermissionsResponseListener { result ->
          promise.resolve(result[Manifest.permission.POST_NOTIFICATIONS]?.status == PermissionsStatus.GRANTED)
        }, Manifest.permission.POST_NOTIFICATIONS)
      }
    }
    AsyncFunction("replaceStockReminders") { json: String ->
      StockReminderReceiver.replace(context, json)
      true
    }
    OnActivityEntersBackground { appContext.currentActivity?.runOnUiThread { stopVoice() } }
    OnDestroy { android.os.Handler(android.os.Looper.getMainLooper()).post { stopVoice() } }
  }
  private fun stopVoice() {
    session += 1
    recognizer?.cancel()
    recognizer?.destroy()
    recognizer = null
  }
}
