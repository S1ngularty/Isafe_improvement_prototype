const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const CHART_SECTIONS = [
  { id: "wl-chart-timeseries", title: "Water Level Over Time" },
  { id: "wl-chart-status-dist", title: "Status Distribution" },
  { id: "wl-chart-hourly", title: "Hourly Water Level Pattern" },
  { id: "wl-chart-daily-range", title: "Daily Water Level Range" },
  { id: "wl-chart-unsafe-per-day", title: "Unsafe Readings per Day" },
  { id: "wl-chart-readings-per-hour", title: "Reading Count per Hour" },
];

function getChartImageData(id) {
  var container = document.getElementById(id);
  if (!container) return null;
  var plotDiv = container.querySelector(".js-plotly-plot");
  if (!plotDiv || typeof window.Plotly?.toImage !== "function") return null;
  var rect = plotDiv.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return window.Plotly.toImage(plotDiv, {
    format: "png",
    scale: 2,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
}

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

function addTitlePage(doc, kpi) {
  var y = 20;

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Water Level Analytics Report", MARGIN, y);
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

  if (kpi) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Performance Indicators", MARGIN, y);
    y += 8;

    var items = [
      ["Total Sensors", String(kpi.totalSensors ?? "\u2014")],
      ["Active Sensors", String(kpi.activeSensors ?? "\u2014") + (kpi.inactiveSensors != null ? " (" + kpi.inactiveSensors + " inactive)" : "")],
      ["Unsafe Readings", String(kpi.unsafeCount ?? 0)],
      ["WARNING Count", String(kpi.warningCount ?? 0)],
      ["FLOOD WARNING Count", String(kpi.floodWarningCount ?? 0)],
    ];
    var colW = CONTENT_W / 3;
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

async function captureSection(id) {
  var container = document.getElementById(id);
  if (!container) return null;
  var { default: html2canvas } = await import("html2canvas");
  var canvas = await html2canvas(container, { scale: 2, useCORS: true });
  return canvas.toDataURL("image/png");
}

function addImageToDoc(doc, imgData, y) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var aspect = img.naturalHeight / img.naturalWidth;
      var imgW = CONTENT_W;
      var imgH = imgW * aspect;
      var maxH = PAGE_H - MARGIN - 20;
      if (imgH > maxH) {
        var scale = maxH / imgH;
        imgH = maxH;
        imgW = CONTENT_W * scale;
      }
      var xOffset = MARGIN + (CONTENT_W - imgW) / 2;
      doc.addImage(imgData, "PNG", xOffset, y, imgW, imgH);
      resolve(y + imgH + 5);
    };
    img.onerror = function () { resolve(y); };
    img.src = imgData;
  });
}

export default async function exportWaterLevelPdf(kpi) {
  var { jsPDF } = await import("jspdf");
  var doc = new jsPDF("p", "mm", "a4");

  var y = addTitlePage(doc, kpi);

  // KPI section screenshot
  var kpiImg = await captureSection("wl-kpi-grid");
  if (kpiImg) {
    if (y + 50 > PAGE_H - MARGIN) {
      doc.addPage();
      y = 15;
    }
    doc.addPage();
    y = 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Key Performance Indicators", MARGIN, y);
    y += 5;
    y = await addImageToDoc(doc, kpiImg, y);
  }

  // Sensor status screenshot
  var sensorImg = await captureSection("wl-sensor-status");
  if (sensorImg) {
    if (y + 50 > PAGE_H - MARGIN) {
      doc.addPage();
      y = 15;
    }
    doc.addPage();
    y = 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Sensor Status", MARGIN, y);
    y += 5;
    y = await addImageToDoc(doc, sensorImg, y);
  }

  // Unsafe conditions screenshot
  var unsafeImg = await captureSection("wl-unsafe-section");
  if (unsafeImg) {
    if (y + 50 > PAGE_H - MARGIN) {
      doc.addPage();
      y = 15;
    }
    doc.addPage();
    y = 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Unsafe Conditions", MARGIN, y);
    y += 5;
    y = await addImageToDoc(doc, unsafeImg, y);
  }

  // Pre-capture all chart images
  var chartPages = [];
  for (var i = 0; i < CHART_SECTIONS.length; i++) {
    var section = CHART_SECTIONS[i];
    try {
      var imgData = await getChartImageData(section.id);
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

      chartPages.push({
        title: section.title,
        imgData: imgData,
        imgW: imgW,
        imgH: imgH,
        blockH: 5 + imgH + 3,
      });
    } catch (e) {
      console.warn("Failed to capture chart:", section.id, e);
    }
  }

  if (chartPages.length > 0) {
    doc.addPage();
    y = 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Analytics Charts", MARGIN, y);
    y += 10;

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
      y += c.imgH + 8;
    }
  }

  doc.save("water-level-analytics-report.pdf");
}
