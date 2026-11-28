import ExpoModulesCore
import Foundation
import PDFKit
import UIKit
import Vision
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Reads recipe photos and PDFs on the device (Vision, PDFKit), and lets
/// Apple Intelligence tidy the text when the device has it. Nothing leaves the phone.
public class AvoCookRecipeScanModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AvoCookRecipeScan")

    AsyncFunction("recognizeText") { (uri: String) async throws -> [[String: Any]] in
      guard let url = URL(string: uri), let data = try? Data(contentsOf: url), let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        throw ImageUnreadableException()
      }
      return try await Self.recognize(cgImage, orientation: Self.orientation(of: image))
    }

    AsyncFunction("readPdf") { (uri: String, maxPages: Int) async throws -> [[String: Any]] in
      guard let url = URL(string: uri), let document = PDFDocument(url: url) else {
        throw PdfUnreadableException()
      }
      if document.isLocked { throw PdfLockedException() }
      var pages: [[String: Any]] = []
      for index in 0..<min(document.pageCount, max(1, maxPages)) {
        guard let page = document.page(at: index) else { continue }
        let text = page.string ?? ""
        // A PDF made from text is read as is; a scanned page is recognized like a photo.
        if text.filter({ !$0.isWhitespace }).count >= 40 {
          pages.append(["text": text])
          continue
        }
        let bounds = page.bounds(for: .mediaBox)
        let scale = min(3, 2400 / max(bounds.width, bounds.height, 1))
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        if let cgImage = page.thumbnail(of: size, for: .mediaBox).cgImage {
          pages.append(["lines": try await Self.recognize(cgImage, orientation: .up)])
        }
      }
      return pages
    }

    AsyncFunction("localModelStatus") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          return "available"
        case .unavailable(.modelNotReady):
          return "downloading"
        case .unavailable(.appleIntelligenceNotEnabled):
          return "disabled"
        default:
          return "unavailable"
        }
      }
      #endif
      return "unavailable"
    }

    AsyncFunction("structureRecipe") { (text: String) async throws -> [String: Any] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return try await AppleRecipeModel.structure(text)
      }
      #endif
      throw LocalModelUnavailableException()
    }
  }

  private static let languages = ["fr-FR", "en-US", "de-DE", "es-ES", "it-IT", "da-DK"]

  /// Lines with boxes in 0–1 page coordinates, top-left origin, as the JS side expects.
  static func recognize(_ image: CGImage, orientation: CGImagePropertyOrientation) async throws -> [[String: Any]] {
    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        if #available(iOS 16.0, *) {
          request.automaticallyDetectsLanguage = true
        }
        if let supported = try? request.supportedRecognitionLanguages() {
          let wanted = languages.filter { supported.contains($0) }
          if !wanted.isEmpty { request.recognitionLanguages = wanted }
        }
        do {
          try VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:]).perform([request])
          let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
            guard let text = observation.topCandidates(1).first?.string else { return nil }
            let box = observation.boundingBox
            return [
              "text": text,
              "x": Double(box.minX),
              "y": Double(1 - box.maxY),
              "width": Double(box.width),
              "height": Double(box.height),
            ]
          }
          continuation.resume(returning: lines)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private static func orientation(of image: UIImage) -> CGImagePropertyOrientation {
    switch image.imageOrientation {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct GeneratedRecipe {
  @Guide(description: "The recipe title exactly as written")
  var name: String
  @Guide(description: "The short introduction written before the ingredients, or an empty string")
  var summary: String
  @Guide(description: "Number of servings written in the text, or 0 when it is not written")
  var servings: Int
  @Guide(description: "Preparation time in minutes written in the text, or 0 when it is not written")
  var prepMinutes: Int
  @Guide(description: "Cooking time in minutes written in the text, or 0 when it is not written")
  var cookMinutes: Int
  @Guide(description: "Every ingredient with its quantity, copied from the text, one ingredient per item")
  var ingredients: [String]
  @Guide(description: "Every preparation step copied from the text, in order, one step per item")
  var steps: [String]
}

@available(iOS 26.0, *)
enum AppleRecipeModel {
  static func structure(_ text: String) async throws -> [String: Any] {
    let model = SystemLanguageModel.default
    guard model.isAvailable else { throw LocalModelUnavailableException() }
    let session = LanguageModelSession(
      model: model,
      instructions: """
      You turn text read from a recipe page into a structured recipe. \
      Copy the words exactly as written, in the language of the text, and never translate. \
      Never add, guess or change an ingredient, a quantity or a step. \
      Leave out page numbers, headers and text that is not part of the recipe.
      """
    )
    let response = try await session.respond(
      to: "Recipe text:\n\(String(text.prefix(6000)))",
      generating: GeneratedRecipe.self
    )
    let recipe = response.content
    return [
      "name": recipe.name,
      "description": recipe.summary,
      "servings": recipe.servings,
      "prepMinutes": recipe.prepMinutes,
      "cookMinutes": recipe.cookMinutes,
      "ingredients": recipe.ingredients,
      "steps": recipe.steps,
    ]
  }
}
#endif

final class ImageUnreadableException: Exception, @unchecked Sendable {
  override var code: String { "ERR_IMAGE_UNREADABLE" }
  override var reason: String { "The image could not be opened" }
}

final class PdfUnreadableException: Exception, @unchecked Sendable {
  override var code: String { "ERR_PDF_UNREADABLE" }
  override var reason: String { "The PDF could not be opened" }
}

final class PdfLockedException: Exception, @unchecked Sendable {
  override var code: String { "ERR_PDF_LOCKED" }
  override var reason: String { "The PDF is protected by a password" }
}

final class LocalModelUnavailableException: Exception, @unchecked Sendable {
  override var code: String { "ERR_LOCAL_MODEL_UNAVAILABLE" }
  override var reason: String { "The on-device model is not available" }
}
