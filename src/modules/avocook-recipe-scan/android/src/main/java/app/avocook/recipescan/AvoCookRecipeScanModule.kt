package app.avocook.recipescan

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import com.google.android.gms.tasks.Task
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.max
import kotlin.math.min
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

/**
 * Reads recipe photos and PDFs on the device with ML Kit, and lets Gemini Nano
 * tidy the text on devices that have it. Nothing leaves the phone.
 */
class AvoCookRecipeScanModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AvoCookRecipeScan")

    AsyncFunction("recognizeText") Coroutine { uri: String ->
      val bitmap = withContext(Dispatchers.IO) { decodeUpright(Uri.parse(uri)) }
        ?: throw CodedException("ERR_IMAGE_UNREADABLE", "The image could not be opened", null)
      try {
        recognize(bitmap)
      } finally {
        bitmap.recycle()
      }
    }

    AsyncFunction("readPdf") Coroutine { uri: String, maxPages: Int ->
      readPdf(Uri.parse(uri), max(1, maxPages))
    }

    AsyncFunction("localModelStatus") Coroutine { ->
      localModelStatus()
    }

    AsyncFunction("structureRecipe") Coroutine { text: String ->
      structureRecipe(text)
    }
  }

  /** Decodes at most ~3000 px and applies the EXIF rotation, so boxes match the upright page. */
  private fun decodeUpright(uri: Uri): Bitmap? {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= 3000) sample *= 2
    val bitmap = resolver.openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null
    val rotation = resolver.openInputStream(uri)?.use {
      when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
      }
    } ?: 0f
    if (rotation == 0f) return bitmap
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, Matrix().apply { postRotate(rotation) }, true)
    if (rotated != bitmap) bitmap.recycle()
    return rotated
  }

  /** Lines with boxes in 0–1 page coordinates, top-left origin, as the JS side expects. */
  private suspend fun recognize(bitmap: Bitmap): List<Map<String, Any>> {
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      val result = recognizer.process(InputImage.fromBitmap(bitmap, 0)).awaitResult()
      val width = bitmap.width.toDouble()
      val height = bitmap.height.toDouble()
      return result.textBlocks.flatMap { block ->
        block.lines.mapNotNull { line ->
          val box = line.boundingBox ?: return@mapNotNull null
          mapOf(
            "text" to line.text,
            "x" to box.left / width,
            "y" to box.top / height,
            "width" to box.width() / width,
            "height" to box.height() / height,
          )
        }
      }
    } finally {
      recognizer.close()
    }
  }

  /** Android has no PDF text API for all versions, so every page is rendered and recognized. */
  private suspend fun readPdf(uri: Uri, maxPages: Int): List<Map<String, Any>> {
    val descriptor = try {
      context.contentResolver.openFileDescriptor(uri, "r")
    } catch (error: Exception) {
      null
    } ?: throw CodedException("ERR_PDF_UNREADABLE", "The PDF could not be opened", null)
    val renderer = try {
      PdfRenderer(descriptor)
    } catch (error: SecurityException) {
      descriptor.close()
      throw CodedException("ERR_PDF_LOCKED", "The PDF is protected by a password", error)
    } catch (error: Exception) {
      descriptor.close()
      throw CodedException("ERR_PDF_UNREADABLE", "The PDF could not be opened", error)
    }
    try {
      val pages = mutableListOf<Map<String, Any>>()
      for (index in 0 until min(renderer.pageCount, maxPages)) {
        val bitmap = renderer.openPage(index).use { page ->
          val scale = min(3f, 2400f / max(page.width, page.height).coerceAtLeast(1))
          Bitmap.createBitmap((page.width * scale).toInt(), (page.height * scale).toInt(), Bitmap.Config.ARGB_8888).also {
            it.eraseColor(Color.WHITE)
            page.render(it, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          }
        }
        try {
          pages.add(mapOf("lines" to recognize(bitmap)))
        } finally {
          bitmap.recycle()
        }
      }
      return pages
    } finally {
      renderer.close()
      descriptor.close()
    }
  }

  private suspend fun localModelStatus(): String {
    // Gemini Nano runs only through AICore on recent devices (Android 8+); any failure means "not here".
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "unavailable"
    return try {
      val model = Generation.getClient()
      try {
        when (model.checkStatus()) {
          FeatureStatus.AVAILABLE -> "available"
          FeatureStatus.DOWNLOADING -> "downloading"
          FeatureStatus.DOWNLOADABLE -> "downloadable"
          else -> "unavailable"
        }
      } finally {
        model.close()
      }
    } catch (error: Throwable) {
      "unavailable"
    }
  }

  private suspend fun structureRecipe(text: String): String {
    if (localModelStatus() != "available") {
      throw CodedException("ERR_LOCAL_MODEL_UNAVAILABLE", "The on-device model is not available", null)
    }
    val prompt = """
      You turn text read from a recipe page into a structured recipe.
      Copy the words exactly as written, in the language of the text, and never translate.
      Never add, guess or change an ingredient, a quantity or a step.
      Leave out page numbers, headers and text that is not part of the recipe.
      Reply with only one JSON object and no other text, with these keys:
      "name" (string), "description" (string, may be empty), "servings" (integer, 0 if not written),
      "prepMinutes" (integer, 0 if not written), "cookMinutes" (integer, 0 if not written),
      "ingredients" (array of strings, one ingredient with its quantity per item),
      "steps" (array of strings, one step per item, in order).

      Recipe text:
      ${text.take(4000)}
    """.trimIndent()
    val model = Generation.getClient()
    try {
      val response = model.generateContent(prompt)
      return response.candidates.firstOrNull()?.text?.takeIf { it.isNotBlank() }
        ?: throw CodedException("ERR_LOCAL_MODEL_EMPTY", "The on-device model returned nothing", null)
    } finally {
      model.close()
    }
  }
}

private suspend fun <T> Task<T>.awaitResult(): T = suspendCancellableCoroutine { continuation ->
  addOnSuccessListener { continuation.resume(it) }
  addOnFailureListener { continuation.resumeWithException(it) }
  addOnCanceledListener { continuation.cancel() }
}
