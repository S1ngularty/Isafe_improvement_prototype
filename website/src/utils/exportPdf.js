const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const CHART_INSIGHT_MAP = {
  "chart-status-distribution": "status_distribution",
  "chart-trend": "incident_trend",
  "chart-temporal-heatmap": "temporal_heatmap",
  "chart-response-times": "response_times",
  "chart-barangay": "barangay",
  "chart-rescuers": "rescuer_performance",
  "chart-blood-type": "blood_type",
  "chart-age-groups": "age_groups",
  "map-heatmap": "incident_heatmap",
};

const CHART_SECTIONS = [
  { id: "chart-status-distribution", title: "Status Distribution" },
  { id: "chart-trend", title: "Daily Incident Trend" },
  { id: "chart-temporal-heatmap", title: "Activity Patterns \u2014 Hour \u00d7 Day of Week" },
  { id: "chart-response-times", title: "Response Time Trend (seconds)" },
  { id: "chart-barangay", title: "Most Affected Barangays" },
  { id: "chart-rescuers", title: "Top Rescuers by Assignments" },
  { id: "chart-blood-type", title: "Blood Type Distribution" },
  { id: "chart-age-groups", title: "Age Groups" },
  { id: "map-heatmap", title: "Incident Heatmap" },
];

function getChartImageData(id) {
  const container = document.getElementById(id);
  if (!container) return null;
  if (id === "map-heatmap") return null;
  const plotDiv = container.querySelector(".js-plotly-plot");
  if (!plotDiv || typeof window.Plotly?.toImage !== "function") return null;
  const rect = plotDiv.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return window.Plotly.toImage(plotDiv, {
    format: "png",
    scale: 2,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
}

async function getMapImageData(id) {
  const container = document.getElementById(id);
  if (!container) return null;
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function addTitlePage(doc, kpi, analysis) {
  let y = 20;

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("CityShield Analytics Report", MARGIN, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    "Generated: " + new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    MARGIN,
    y
  );
  doc.setTextColor(0);
  y += 14;

  if (analysis?.executive_summary) {
    y += 4;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("AI Executive Summary", MARGIN, y);
    y += 10;

    doc.setFontSize(17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85);

    var paras = analysis.executive_summary.split("\n\n").filter(Boolean);
    for (var p = 0; p < paras.length; p++) {
      var lines = doc.splitTextToSize(paras[p], CONTENT_W);
      for (var l = 0; l < lines.length; l++) {
        doc.text(lines[l], MARGIN, y);
        y += 8;
      }
      y += 4;
    }

    doc.setTextColor(0);
  }

  y += 6;

  if (kpi && y + 40 < PAGE_H - MARGIN) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Performance Indicators", MARGIN, y);
    y += 8;

    const items = [
      ["Total Users", String(kpi.total_users ?? "\u2014")],
      ["Emergency", String(kpi.users_emergency ?? "\u2014") + (kpi.emergency_rate != null ? " (" + kpi.emergency_rate + "%)" : "")],
      ["Help Needed", String(kpi.users_help ?? "\u2014")],
      ["Active Rescuers", String(kpi.active_rescuers ?? "\u2014") + (kpi.available_rescuers != null ? " (" + kpi.available_rescuers + " avail.)" : "")],
      ["Avg Response", kpi.avg_response_seconds != null ? Math.round(kpi.avg_response_seconds / 60) + "m" : "\u2014"],
      ["Resolution Rate", kpi.resolution_rate != null ? kpi.resolution_rate + "%" : "\u2014"],
    ];
    const colW = CONTENT_W / 3;
    doc.setFontSize(10);
    items.forEach(function (item, i) {
      var col = i % 3;
      var row = Math.floor(i / 3);
      var x = MARGIN + col * colW;
      var yy = y + row * 12;
      doc.setFont("helvetica", "bold");
      doc.text(item[1], x, yy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(item[0], x, yy + 3.5);
      doc.setTextColor(0);
      doc.setFontSize(10);
    });
  }

  return y;
}

export default async function exportAnalyticsPdf(kpi, recentAlerts, analysis) {
  var { jsPDF } = await import("jspdf");
  var doc = new jsPDF("p", "mm", "a4");

  var y = addTitlePage(doc, kpi, analysis);

  // Pre-capture all chart images
  var chartPages = [];
  for (var i = 0; i < CHART_SECTIONS.length; i++) {
    var section = CHART_SECTIONS[i];
    try {
      var imgData;
      if (section.id === "map-heatmap") {
        imgData = await getMapImageData(section.id);
      } else {
        imgData = await getChartImageData(section.id);
      }
      if (!imgData) continue;

      var img = await loadImage(imgData);
      var aspect = img.naturalHeight / img.naturalWidth;
      var imgW = CONTENT_W;
      var imgH = imgW * aspect;
      var maxH = PAGE_H - MARGIN - 50;
      if (imgH > maxH) {
        var scale = maxH / imgH;
        imgH = maxH;
        imgW = CONTENT_W * scale;
      }

      var insight = analysis?.chart_insights?.[CHART_INSIGHT_MAP[section.id]] || null;
      var insightLines = insight ? doc.splitTextToSize("AI: " + insight, CONTENT_W) : [];
      var insightH = insightLines.length > 0 ? 6 + insightLines.length * 3.5 + 3 : 3;

      chartPages.push({
        title: section.title,
        imgData: imgData,
        imgW: imgW,
        imgH: imgH,
        insight: insight,
        insightLines: insightLines,
        insightH: insightH,
        blockH: 5 + imgH + insightH,
      });
    } catch (e) {
      console.warn("Failed to capture chart:", section.id, e);
    }
  }

  doc.addPage();
  y = 15;

  // Lay out charts with smart page breaks (2+ per page)
  for (var j = 0; j < chartPages.length; j++) {
    var c = chartPages[j];
    if (y + c.blockH > PAGE_H - MARGIN) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(c.title, MARGIN, y);
    y += 5;

    var xOffset = MARGIN + (CONTENT_W - c.imgW) / 2;
    doc.addImage(c.imgData, "PNG", xOffset, y, c.imgW, c.imgH);
    y += c.imgH;

    if (c.insight) {
      y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      for (var k = 0; k < c.insightLines.length; k++) {
        doc.text(c.insightLines[k], MARGIN, y);
        y += 3.5;
      }
      doc.setTextColor(0);
      y += 3;
    } else {
      y += 3;
    }
  }

  // Recent Activity
  if (recentAlerts?.items?.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recent Activity", MARGIN, 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    var yPos = 28;
    for (var jj = 0; jj < Math.min(recentAlerts.items.length, 30); jj++) {
      var item = recentAlerts.items[jj];
      if (yPos > PAGE_H - MARGIN) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Recent Activity (continued)", MARGIN, yPos);
        yPos += 8;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
      }
      var statusLabel = item.new_status === "emergency" ? "Emergency" : item.new_status === "help" ? "Help" : "Safe";
      doc.setFont("helvetica", "bold");
      doc.text(item.full_name || "User", MARGIN, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("status changed to " + statusLabel, MARGIN + 45, yPos);
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.text(
        item.created_at ? new Date(item.created_at).toLocaleString() : "",
        MARGIN + 120,
        yPos
      );
      doc.setTextColor(0);
      doc.setFontSize(8);
      yPos += 5;
    }
  }

  doc.save("cityshield-analytics-report.pdf");
}
