import AppKit
import Foundation
import Vision

/// Fast OCR for iOS Simulator screenshots. Prints one JSON object:
/// {
///   "blocking": bool,
///   "phrases": [String],
///   "buttons": [String],
///   "targets": [{ "label": String, "x": Double, "y": Double }],  // normalized center, top-left origin
///   "text": String
/// }

let blockingNeedles = [
  "apple account",
  "apple id",
  "enter the password",
  "verification failed",
  "update apple id",
  "sign in to apple",
]

let dismissNeedles = [
  "not now",
  "cancel",
  "close",
  "later",
  "don't allow",
  "dont allow",
  "done",
]

guard CommandLine.arguments.count > 1 else {
  fputs("usage: ios_ocr_alert <screenshot.png>\n", stderr)
  exit(2)
}

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cgImage = rep.cgImage
else {
  fputs("error: could not read image\n", stderr)
  exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .fast
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
  try handler.perform([request])
} catch {
  fputs("error: OCR failed: \(error)\n", stderr)
  exit(2)
}

var lines: [String] = []
var targets: [[String: Any]] = []
for observation in request.results ?? [] {
  guard let candidate = observation.topCandidates(1).first else { continue }
  let text = candidate.string
  lines.append(text)
  let normalized = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
  guard dismissNeedles.contains(where: { normalized == $0 || normalized.contains($0) }) else {
    continue
  }
  // Vision boxes are normalized, origin bottom-left. Convert center to top-left origin.
  let box = observation.boundingBox
  let cx = box.origin.x + box.size.width / 2
  let cyTopLeft = 1 - (box.origin.y + box.size.height / 2)
  targets.append([
    "label": text,
    "x": cx,
    "y": cyTopLeft,
  ])
}

let joined = lines.joined(separator: "\n")
let lower = joined.lowercased()
let phrases = blockingNeedles.filter { lower.contains($0) }
let buttons = targets.compactMap { $0["label"] as? String }

let payload: [String: Any] = [
  "blocking": !phrases.isEmpty,
  "phrases": phrases,
  "buttons": buttons,
  "targets": targets,
  "text": joined,
]

let data = try! JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data([0x0A]))
exit(0)
