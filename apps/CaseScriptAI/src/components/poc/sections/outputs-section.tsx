import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TestButton } from "@/components/common/test-button";
import { usePdfOutput } from "@/hooks/pdf/use-pdf-output";

export const OutputsSection = () => {
  const {
    pdfUri,
    isGenerating,
    pdfError,
    hasPipelineContent,
    generateReportPdf,
    handleShowPdf,
    handleDownloadPdf,
  } = usePdfOutput();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Outputs & Security</Text>

      {!hasPipelineContent ? (
        <Text style={styles.hintText}>Run the pipeline above to generate a SOAP note first.</Text>
      ) : null}

      {pdfError ? <Text style={styles.errorText}>{pdfError}</Text> : null}

      {!pdfUri ? (
        <TestButton
          title={isGenerating ? "Generating PDF..." : "Generate PDF"}
          onPress={generateReportPdf}
          loading={isGenerating}
          disabled={isGenerating}
          style={{ backgroundColor: "#007AFF" }}
        />
      ) : (
        <View style={styles.actionRow}>
          <TestButton
            title="Show PDF"
            onPress={handleShowPdf}
            style={styles.halfButton}
          />
          <TestButton
            title="Download PDF"
            onPress={handleDownloadPdf}
            style={[styles.halfButton, styles.downloadButton]}
          />
        </View>
      )}

      <TestButton
        title="View Encrypted File"
        onPress={() => console.log("View Encrypted File pressed")}
        style={{ backgroundColor: "#5856D6" }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 13,
    color: "#888",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfButton: {
    flex: 1,
    marginBottom: 12,
  },
  downloadButton: {
    backgroundColor: "#34C759",
  },
});
