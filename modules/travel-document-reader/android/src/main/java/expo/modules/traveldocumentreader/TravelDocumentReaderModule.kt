package expo.modules.traveldocumentreader

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.min

class TravelDocumentReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TravelDocumentReader")

    AsyncFunction("recognizeTextAsync") { uriValue: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("The app is not ready to read documents.")
      val uri = Uri.parse(uriValue)
      val file = uri.path?.let(::File)
        ?: throw IllegalArgumentException("The shared document could not be opened.")
      when (file.extension.lowercase()) {
        "txt", "eml" -> file.readText()
        "pdf" -> recognizePdf(file)
        else -> recognizeImage(InputImage.fromFilePath(context, uri))
      }
    }

    AsyncFunction("previewDocumentsAsync") { uris: List<String> ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("The app is not ready to open documents.")
      val first = uris.firstOrNull()
        ?: throw IllegalArgumentException("The shared document could not be opened.")
      val parsed = Uri.parse(first)
      val file = parsed.path?.let(::File)
        ?: throw IllegalArgumentException("The shared document could not be opened.")
      if (!file.exists()) {
        throw IllegalArgumentException("The shared document could not be opened.")
      }
      val contentUri = try {
        FileProvider.getUriForFile(
          context,
          context.packageName + ".traveldocumentreader.provider",
          file,
        )
      } catch (_: Exception) {
        parsed
      }
      val extension = file.extension.lowercase()
      val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
        ?: "application/octet-stream"
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(contentUri, mime)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      context.startActivity(intent)
    }
  }

  private fun recognizePdf(file: File): String {
    val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    val renderer = PdfRenderer(descriptor)
    val pages = mutableListOf<String>()
    try {
      for (index in 0 until min(renderer.pageCount, 12)) {
        val page = renderer.openPage(index)
        try {
          val width = min(2200, page.width * 3)
          val height = (width.toFloat() / page.width * page.height).toInt()
          val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
          bitmap.eraseColor(android.graphics.Color.WHITE)
          page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          pages.add(recognizeImage(InputImage.fromBitmap(bitmap, 0)))
          bitmap.recycle()
        } finally {
          page.close()
        }
      }
    } finally {
      renderer.close()
      descriptor.close()
    }
    val text = pages.filter { it.isNotBlank() }.joinToString("\n\n")
    if (text.isBlank()) throw IllegalArgumentException(
      "No readable text was found in this document."
    )
    return text
  }

  private fun recognizeImage(image: InputImage): String {
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    return try {
      val result = Tasks.await(recognizer.process(image))
      if (result.text.isBlank()) {
        throw IllegalArgumentException(
          "No readable text was found in this document."
        )
      }
      result.text
    } finally {
      recognizer.close()
    }
  }
}
