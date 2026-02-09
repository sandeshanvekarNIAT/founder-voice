import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { supabase } from "@/lib/supabase";
import PDFParser from "pdf2json";

export async function POST(req: NextRequest) {
    console.log("POST /api/parse-pdf: Request received");

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

        try {
            console.log("Starting PDF extraction with pdf2json...");
            const pdfParser = new PDFParser(null, 1);

            text = await new Promise<string>((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve(pdfParser.getRawTextContent());
                });
                pdfParser.parseBuffer(buffer);
            });
            console.log(`Extracted ${text.length} characters`);
        } catch (parseError: any) {
            console.error("pdf2json extraction failed:", parseError);
            return NextResponse.json({
                error: "PDF Extraction Failed",
                details: parseError.message
            }, { status: 500 });
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
