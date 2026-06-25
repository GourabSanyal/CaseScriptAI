import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { Directory, Paths } from "expo-file-system";
import { generatePDF } from "@/services/pdf/generator";
import { savePdfToLocal, showPdf } from "@/utils/pdf-utils";
import { usePocStore } from "@/stores/poc-store";

export const usePdfOutput = () => {
  const pipelineResult = usePocStore((s) => s.pipelineResult);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const hasPipelineContent = Boolean(
    pipelineResult?.transcript && pipelineResult?.soapNote && !pipelineResult.soapNoteError,
  );

  useEffect(() => {
    setPdfUri(null);
    setPdfError(null);
  }, [pipelineResult?.transcript, pipelineResult?.soapNote]);

  const buildOutputPath = (): string => {
    const reportsDir = new Directory(Paths.document, "cases", "poc", "reports");
    if (!reportsDir.exists) {
      reportsDir.create({ intermediates: true, idempotent: true });
    }
    return `${reportsDir.uri}/soap-note-latest.pdf`;
  };

  const generateReportPdf = useCallback(async (): Promise<void> => {
    if (!pipelineResult?.transcript || !pipelineResult.soapNote) {
      Alert.alert("Nothing to export", "Run the pipeline first to create a transcript and SOAP note.");
      return;
    }

    setIsGenerating(true);
    setPdfError(null);

    const result = await generatePDF(
      pipelineResult.transcript,
      pipelineResult.soapNote,
      buildOutputPath(),
    );

    setIsGenerating(false);

    if (!result.success) {
      setPdfError(result.error ?? "Failed to generate PDF");
      return;
    }

    setPdfUri(result.data);
  }, [pipelineResult]);

  const handleShowPdf = useCallback(async (): Promise<void> => {
    if (!pdfUri) return;
    try {
      await showPdf(pdfUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open PDF";
      Alert.alert("Open failed", message);
    }
  }, [pdfUri]);

  const handleDownloadPdf = useCallback(async (): Promise<void> => {
    if (!pdfUri) return;
    try {
      await savePdfToLocal(pdfUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save PDF";
      Alert.alert("Save failed", message);
    }
  }, [pdfUri]);

  return {
    pdfUri,
    isGenerating,
    pdfError,
    hasPipelineContent,
    generateReportPdf,
    handleShowPdf,
    handleDownloadPdf,
  };
};
