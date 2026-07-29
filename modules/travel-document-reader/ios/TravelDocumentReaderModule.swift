import ExpoModulesCore
import PDFKit
import UIKit
import Vision

public class TravelDocumentReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TravelDocumentReader")

    AsyncFunction("recognizeTextAsync") { (uri: String) -> String in
      guard let url = URL(string: uri), url.isFileURL else {
        throw InvalidDocumentUrlException()
      }
      return try recognizeDocument(at: url)
    }
  }

  private func recognizeDocument(at url: URL) throws -> String {
    let fileExtension = url.pathExtension.lowercased()
    if ["txt", "eml"].contains(fileExtension) {
      return try String(contentsOf: url, encoding: .utf8)
    }
    if fileExtension == "pdf" {
      guard let document = PDFDocument(url: url), document.pageCount > 0 else {
        throw UnsupportedDocumentException()
      }
      var pages: [String] = []
      for index in 0..<min(document.pageCount, 12) {
        guard let page = document.page(at: index) else { continue }
        if let embeddedText = page.string?.trimmingCharacters(in: .whitespacesAndNewlines),
           embeddedText.count >= 20 {
          pages.append(embeddedText)
          continue
        }
        let bounds = page.bounds(for: .mediaBox)
        let scale = min(3.0, 2200.0 / max(bounds.width, 1))
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let image = page.thumbnail(of: size, for: .mediaBox)
        if let cgImage = image.cgImage {
          pages.append(try recognizeText(in: cgImage))
        }
      }
      let text = pages.filter { !$0.isEmpty }.joined(separator: "\n\n")
      if text.isEmpty { throw NoTextFoundException() }
      return text
    }
    guard let image = UIImage(contentsOfFile: url.path), let cgImage = image.cgImage else {
      throw UnsupportedDocumentException()
    }
    let text = try recognizeText(in: cgImage)
    if text.isEmpty { throw NoTextFoundException() }
    return text
  }

  private func recognizeText(in image: CGImage) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    let observations = (request.results ?? []).sorted {
      if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.015 {
        return $0.boundingBox.midY > $1.boundingBox.midY
      }
      return $0.boundingBox.minX < $1.boundingBox.minX
    }
    return observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
  }
}

private final class InvalidDocumentUrlException: Exception, @unchecked Sendable {
  override var reason: String {
    "The shared document could not be opened."
  }
}

private final class UnsupportedDocumentException: Exception, @unchecked Sendable {
  override var reason: String {
    "Choose a supported image, PDF, text file, or saved email."
  }
}

private final class NoTextFoundException: Exception, @unchecked Sendable {
  override var reason: String {
    "No readable text was found in this document."
  }
}
