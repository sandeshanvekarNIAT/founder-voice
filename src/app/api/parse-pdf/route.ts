import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    console.log("POST /api/parse-pdf: Request received");

    // Polyfill for DOMMatrix inside the worker to be safe
    if (typeof global.DOMMatrix === 'undefined') {
        // @ts-ignore
        global.DOMMatrix = class DOMMatrix {
            constructor() { }
        };
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`Processing file: ${file.name} (${file.size} bytes)`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = "";
        let pdfModule: any;

        try {
            // Attempt to load pdf-parse strictly inside the try block
            pdfModule = require("pdf-parse");
        } catch (loadError: any) {
            console.error("Failed to load pdf-parse library:", loadError);
            return NextResponse.json({
                error: "PDF Library Load Failure",
                details: loadError.message,
                suggestion: "Check if pdf-parse is correctly installed and compatible with this Node version."
            }, { status: 500 });
        }

        let pdf: any;
        if (typeof pdfModule === 'function') {
            pdf = pdfModule;
        } else if (pdfModule && typeof pdfModule.PDFParse === 'function') {
            pdf = pdfModule.PDFParse;
        } else if (pdfModule && (pdfModule.default || pdfModule.pdf)) {
            pdf = pdfModule.default || pdfModule.pdf;
        }

        if (typeof pdf !== 'function') {
            throw new Error(`PDF Library initialization failed. Found: ${typeof pdf}`);
        }

        try {
            console.log("Starting PDF extraction with pdf-parse...");
            const data = await pdf(buffer);
            text = data.text;
            console.log(`Extracted ${text.length} characters`);
        } catch (parseError: any) {
            console.error("pdf-parse extraction failed:", parseError);

            // Fallback to pdf2json if available
            try {
                console.log("Attempting fallback to pdf2json...");
                const PDFParser = require("pdf2json");
                const pdfParser = new PDFParser(null, 1);

                text = await new Promise<string>((resolve, reject) => {
                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                    pdfParser.on("pdfParser_dataReady", () => {
                        resolve(pdfParser.getRawTextContent());
                    });
                    pdfParser.parseBuffer(buffer);
                });
                console.log(`Extracted ${text.length} characters via pdf2json`);
            } catch (fallbackError: any) {
                throw new Error(`Both pdf-parse and pdf2json failed. Primary error: ${parseError.message}. Fallback error: ${fallbackError.message}`);
            }
        }

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "No text could be extracted from this PDF" }, { status: 422 });
        }

        // Database persistence (Optional failure)
        let deckId = null;
        try {
            const { data: insertData, error: dbError } = await supabase
                .from('pitch_decks')
                .insert([{ file_name: file.name, file_content: text }])
                .select()
                .single();

            if (dbError) {
                console.error("Supabase Error (Non-blocking):", dbError);
            } else {
                deckId = insertData.id;
            }
        } catch (dbEx) {
            console.error("Supabase Exception (Non-blocking):", dbEx);
        }

        return NextResponse.json({
            text,
            deckId,
            warning: deckId ? null : "Document processed but failed to save to database."
        });

    } catch (error: any) {
        console.error("API /api/parse-pdf Fatal Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to process PDF",
            details: String(error)
        }, { status: 500 });
    }
}
