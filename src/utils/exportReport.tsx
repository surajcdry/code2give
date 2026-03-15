"use client";

import { pdf } from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#FFCC10", paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 10, color: "#6B7280", marginTop: 4 },
  table: { display: "flex", width: "auto", marginTop: 10 },
  tableRow: { flexDirection: "row", borderBottomColor: "#F3F4F6", borderBottomWidth: 1, minHeight: 25, alignItems: "center" },
  tableColHeader: { backgroundColor: "#F9FAFB", padding: 5 },
  tableCellHeader: { fontSize: 9, fontWeight: "bold", color: "#374151" },
  col1: { width: "40%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "20%" },
  tableCell: { fontSize: 8, color: "#4B5563", padding: 5 },
});

const MyDocument = ({ data, type }: { data: any[], type: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>LemonAid Data Report</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleString()} | Category: {type}</Text>
      </View>
      <View style={styles.table}>
        <View style={[styles.tableRow, { backgroundColor: "#F3F4F6" }]}>
          <View style={[styles.tableColHeader, styles.col1]}><Text style={styles.tableCellHeader}>Name/Text</Text></View>
          <View style={[styles.tableColHeader, styles.col2]}><Text style={styles.tableCellHeader}>Status/Sentiment</Text></View>
          <View style={[styles.tableColHeader, styles.col3]}><Text style={styles.tableCellHeader}>Location/Tags</Text></View>
          <View style={[styles.tableColHeader, styles.col4]}><Text style={styles.tableCellHeader}>Metric/Date</Text></View>
        </View>
        {data.map((item, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <View style={styles.col1}><Text style={styles.tableCell}>{item.name || item.text || "—"}</Text></View>
            <View style={styles.col2}><Text style={styles.tableCell}>{item.status || item.sentiment || "—"}</Text></View>
            <View style={styles.col3}><Text style={styles.tableCell}>{item.city || (item.tags ? item.tags.join(", ") : "—")}</Text></View>
            <View style={styles.col4}><Text style={styles.tableCell}>{item.ratingAverage || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—")}</Text></View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export const downloadFullReport = async (data: any[], tab: string) => {
  if (!data || data.length === 0) return;
  try {
    // @ts-ignore - fixing the React Element type mismatch
    const blob = await pdf(<MyDocument data={data} type={tab} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LemonAid_${tab}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF Export failed:", error);
  }
};