const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const getDateFilter = (query) => {
  const now = new Date();
  let start, end;

  switch (query.filter) {
    case "daily":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      break;
    case "weekly":
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      break;

    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      break;

    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      break;

    case "custom":
      if (!query.startDate || !query.endDate) {
        start = new Date(0);
        end = new Date();
      } else {
        start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:

      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
  }

  return { createdAt: { $gte: start, $lte: end } };
};

const loadSalesReport = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const selectedFilter = req.query.filter || "monthly";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalOrdersCount = await Order.countDocuments({
      ...filter,
      status: { $nin: ["Cancelled", "Payment Failed"] }
    });

    const order = await Order.find({
      ...filter,
      status: { $nin: ["Cancelled", "Payment Failed"] }
    })
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const orders = await Order.find({
      ...filter,
      status: { $nin: ["Cancelled", "Payment Failed"] }
    }).populate("products.productId").sort({ createdAt: -1 });


    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalCouponDiscount = 0;

    orders.forEach((order) => {
      totalRevenue += order.totalAmount || 0;
      totalDiscount += order.discount || 0;


      if (order.products && order.products.length) {
        order.products.forEach((p) => {
          if (p.status !== "Cancelled") {
            totalCouponDiscount += p.discount || 0;
          }
        });
      }
    });
    const revenueByDate = {};
    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
      });
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (order.totalAmount || 0);
    });

    const chartData = {
      labels: Object.keys(revenueByDate),
      values: Object.values(revenueByDate)
    };


    const statusMap = {};
    orders.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });


    const tableOrders = orders.map((o) => ({
      orderId: o.orderId || o._id,
      date: new Date(o.createdAt).toLocaleDateString("en-IN"),
      paymentMethod: o.paymentMethod,
      status: o.status,
      discount: o.discount || 0,
      couponCode: o.couponCode || "—",
      totalAmount: o.totalAmount || 0
    }));

    res.render("salesReport", {
      totalOrders: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalCouponDiscount: totalCouponDiscount.toFixed(2),
      chartData,
      statusData: {
        labels: Object.keys(statusMap),
        values: Object.values(statusMap)
      },
      tableOrders,
      selectedFilter,
      startDate,
      endDate,
      currentPage: page,
      totalPages: Math.ceil(totalOrdersCount / limit)
    });

  } catch (error) {
    console.error("Sales report error:", error);
    res.redirect("/admin/dashboard");
  }
};


const exportPdf = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    const orders = await Order.find({
      ...filter,
      status: { $nin: ["Cancelled", "Payment Failed"] }
    }).sort({ createdAt: -1 });

    let totalRevenue = 0;
    let totalDiscount = 0;
    orders.forEach((o) => {
      totalRevenue += o.totalAmount || 0;
      totalDiscount += o.discount || 0;
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 70).fill("#1e1e2d");
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold")
      .text("QUORA — Sales Report", 40, 22, { align: "center" });
    doc.fillColor("#aaaaaa").fontSize(10).font("Helvetica")
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 40, 48, { align: "center" });

    let y = 90;

    const boxData = [
      { label: "Total Orders", value: orders.length },
      { label: "Total Revenue", value: `Rs.${totalRevenue.toFixed(2)}` },
      { label: "Total Discount", value: `Rs.${totalDiscount.toFixed(2)}` }
    ];
    const boxW = 155;
    boxData.forEach((box, i) => {
      const x = 40 + i * (boxW + 15);
      doc.rect(x, y, boxW, 55).fill("#f4f6f9");
      doc.fillColor("#888888").fontSize(9).font("Helvetica")
        .text(box.label.toUpperCase(), x + 10, y + 10, { width: boxW - 20 });
      doc.fillColor("#1e1e2d").fontSize(16).font("Helvetica-Bold")
        .text(String(box.value), x + 10, y + 25, { width: boxW - 20 });
    });

    y += 75;


    const cols = [
      { header: "Order ID", x: 40, w: 110 },
      { header: "Date", x: 150, w: 80 },
      { header: "Payment", x: 230, w: 80 },
      { header: "Coupon", x: 310, w: 70 },
      { header: "Discount", x: 380, w: 70 },
      { header: "Amount", x: 450, w: 80 }
    ];
    const ROW_H = 24;

    doc.rect(40, y, 510, ROW_H).fill("#1e1e2d");
    cols.forEach((col) => {
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(col.header, col.x + 4, y + 7, { width: col.w - 8 });
    });
    y += ROW_H;

    orders.forEach((order, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      doc.rect(40, y, 510, ROW_H).fill(idx % 2 === 0 ? "#f9f9f9" : "#ffffff");
      doc.rect(40, y, 510, ROW_H).strokeColor("#e0e0e0").lineWidth(0.5).stroke();

      const row = [
        String(order.orderId || order._id).substring(0, 14),
        new Date(order.createdAt).toLocaleDateString("en-IN"),
        order.paymentMethod || "—",
        order.couponCode || "—",
        `Rs.${(order.discount || 0).toFixed(2)}`,
        `Rs.${(order.totalAmount || 0).toFixed(2)}`
      ];

      cols.forEach((col, ci) => {
        doc.fillColor("#333333").fontSize(8).font("Helvetica")
          .text(row[ci], col.x + 4, y + 7, { width: col.w - 8 });
      });
      y += ROW_H;
    });

    const footerY = doc.page.height - 40;
    doc.moveTo(40, footerY - 10).lineTo(550, footerY - 10)
      .strokeColor("#dddddd").lineWidth(1).stroke();
    doc.fillColor("#aaaaaa").fontSize(9)
      .text("QUORA Cosmetics — Confidential Sales Report", 40, footerY, { align: "center", width: 510 });

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).send("Failed to generate PDF");
  }
};


const exportExcel = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    const orders = await Order.find({
      ...filter,
      status: { $nin: ["Cancelled", "Payment Failed"] }
    }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "QUORA Admin";
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "QUORA — Sales Report";
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1e1e2d" } };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:G2");
    sheet.getCell("A2").value = `Generated: ${new Date().toLocaleDateString("en-IN")}`;
    sheet.getCell("A2").alignment = { horizontal: "center" };
    sheet.getCell("A2").font = { color: { argb: "FF888888" }, size: 10 };

    let totalRevenue = 0, totalDiscount = 0;
    orders.forEach((o) => {
      totalRevenue += o.totalAmount || 0;
      totalDiscount += o.discount || 0;
    });

    sheet.getRow(4).values = ["Total Orders", "Total Revenue", "Total Discount"];
    sheet.getRow(5).values = [orders.length, `Rs.${totalRevenue.toFixed(2)}`, `Rs.${totalDiscount.toFixed(2)}`];
    [4, 5].forEach((r) => {
      sheet.getRow(r).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf4f6f9" } };
      });
    });


    sheet.getRow(7).values = [
      "Order ID", "Date", "Payment Method",
      "Coupon Code", "Discount (₹)", "Total Amount (₹)", "Status"
    ];
    sheet.getRow(7).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1e1e2d" } };
      cell.alignment = { horizontal: "center" };
    });

    sheet.columns = [
      { key: "orderId", width: 20 },
      { key: "date", width: 14 },
      { key: "paymentMethod", width: 16 },
      { key: "couponCode", width: 16 },
      { key: "discount", width: 14 },
      { key: "totalAmount", width: 16 },
      { key: "status", width: 14 }
    ];

    orders.forEach((order, idx) => {
      const row = sheet.addRow({
        orderId: String(order.orderId || order._id),
        date: new Date(order.createdAt).toLocaleDateString("en-IN"),
        paymentMethod: order.paymentMethod || "—",
        couponCode: order.couponCode || "—",
        discount: order.discount || 0,
        totalAmount: order.totalAmount || 0,
        status: order.status
      });

      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf9f9f9" } };
        });
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).send("Failed to generate Excel");
  }
};

module.exports = {
  loadSalesReport,
  exportPdf,
  exportExcel
};