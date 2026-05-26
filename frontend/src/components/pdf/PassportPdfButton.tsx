"use client";

import { pdf, Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 12 },
  row: { marginBottom: 6 },
});

function PassportDocument({ passport }: { passport: Record<string, unknown> }) {
  const history = Array.isArray(passport.history)
    ? (passport.history as { action: string; description: string }[])
    : [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AgroTrack Farm Passport</Text>
        <Text style={styles.row}>ID: {String(passport.passportId)}</Text>
        <Text style={styles.row}>Crop: {String(passport.crop)}</Text>
        <Text style={styles.row}>Location: {String(passport.location)}</Text>
        <Text style={styles.row}>
          Plant: {String(passport.plantDate)} · Harvest: {String(passport.harvestDate)}
        </Text>
        <Text style={{ marginTop: 12, fontWeight: "bold" }}>History</Text>
        {history.map((h, i) => (
          <Text key={i} style={styles.row}>
            {h.action}: {h.description}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function PassportPdfButton({ passport }: { passport: Record<string, unknown> }) {
  async function download() {
    const blob = await pdf(<PassportDocument passport={passport} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farm-passport-${String(passport.passportId).slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void download()}>
      <Download className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}
