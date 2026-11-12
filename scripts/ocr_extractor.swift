import Foundation
import PDFKit
import Vision

let pdfPath = "/Users/ahmedweal/Downloads/Renal Module MCQs Bank.pdf"
let outDir = "/Users/ahmedweal/twisted-medicine-renal/raw_ocr"

guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)) else {
    print("Error: Could not open PDF")
    exit(1)
}

let totalPages = doc.pageCount
print("Total pages to process: \(totalPages)")

struct TextItem: Codable {
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let conf: Double
}

struct PageOCR: Codable {
    let page: Int
    let items: [TextItem]
}

func processPage(index: Int) -> PageOCR? {
    guard let page = doc.page(at: index) else { return nil }
    let pageRect = page.bounds(for: .mediaBox)
    let renderer = NSImage(size: pageRect.size)
    renderer.lockFocus()
    guard let context = NSGraphicsContext.current?.cgContext else {
        renderer.unlockFocus()
        return nil
    }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(pageRect)
    page.draw(with: .mediaBox, to: context)
    renderer.unlockFocus()
    
    guard let cgImage = renderer.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        return nil
    }
    
    var items: [TextItem] = []
    let request = VNRecognizeTextRequest { req, err in
        guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
        for obs in observations {
            if let cand = obs.topCandidates(1).first {
                items.append(TextItem(
                    text: cand.string,
                    x: Double(obs.boundingBox.midX),
                    y: Double(obs.boundingBox.midY),
                    w: Double(obs.boundingBox.width),
                    h: Double(obs.boundingBox.height),
                    conf: Double(cand.confidence)
                ))
            }
        }
    }
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US", "ar-SA"]
    request.usesLanguageCorrection = true
    
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
    
    return PageOCR(page: index, items: items)
}

let start = Date()
print("Starting OCR extraction for all \(totalPages) pages...")

// Concurrent processing in batches of 4 to keep memory and CPU balanced
let queue = OperationQueue()
queue.maxConcurrentOperationCount = 4

for p in 0..<totalPages {
    queue.addOperation {
        let outFile = "\(outDir)/page_\(String(format: "%03d", p)).json"
        if FileManager.default.fileExists(atPath: outFile) {
            // Already processed
            return
        }
        if let pageData = processPage(index: p) {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            if let data = try? encoder.encode(pageData) {
                try? data.write(to: URL(fileURLWithPath: outFile))
            }
        }
        if (p + 1) % 10 == 0 || p == totalPages - 1 {
            let done = (0..<totalPages).filter {
                FileManager.default.fileExists(atPath: "\(outDir)/page_\(String(format: "%03d", $0)).json")
            }.count
            let elapsed = Date().timeIntervalSince(start)
            print(String(format: "Progress: %d/%d pages (%.1f%%) in %.1fs", done, totalPages, Double(done)/Double(totalPages)*100, elapsed))
        }
    }
}

queue.waitUntilAllOperationsAreFinished()
let totalElapsed = Date().timeIntervalSince(start)
print(String(format: "Completed OCR for all %d pages in %.1f seconds!", totalPages, totalElapsed))
