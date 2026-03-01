const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const getDateFilter = (query) => {
  const now = new Date();
  let start, end;

  switch (query.filter) {
    case "daily":
      start = new Date(now.setHours(0,0,0,0));
      end = new Date();
      break;

    case "weekly":
      start = new Date();
      start.setDate(start.getDate() - 7);
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
      start = new Date(query.startDate);
      end = new Date(query.endDate);
      break;

    default:
      start = new Date(0);
      end = new Date();
  }

  return { createdAt: { $gte: start, $lte: end } };
};

const loadSalesReport = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    const orders = await Order.find({
      ...filter,
      status: { $ne: "Cancelled" }
    });

    let totalRevenue = 0;
    let totalDiscount = 0;

    orders.forEach(order => {
      totalRevenue += order.totalAmount;
      totalDiscount += order.discount || 0;
    });

    const chartData = {
      labels: orders.map(o => new Date(o.createdAt).toLocaleDateString()),
      values: orders.map(o => o.totalAmount)
    };

    const statusMap = {};
    orders.forEach(o => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });

    res.render("salesReport", {
      totalOrders: orders.length,
      totalRevenue,
      totalDiscount,
      chartData,
      statusData: {
        labels: Object.keys(statusMap),
        values: Object.values(statusMap)
      }
    });

  } catch (error) {
    console.log("Sales report error:", error);
    res.redirect("/admin/dashboard");
  }
};

const exportPdf = async (req, res) => {
  const orders = await Order.find({ status: { $ne: "Cancelled" } });

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=sales.pdf");

  doc.pipe(res);
  doc.text("Sales Report", { align: "center" });
  doc.moveDown();

  orders.forEach(o => {
    doc.text(`Order: ${o._id} | Amount: ₹${o.totalAmount}`);
  });

  doc.end();
};

const exportExcel = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales");

  sheet.columns = [
    { header: "Order ID", key: "id" },
    { header: "Amount", key: "amount" },
    { header: "Status", key: "status" }
  ];

  const orders = await Order.find();

  orders.forEach(o => {
    sheet.addRow({
      id: o._id.toString(),
      amount: o.totalAmount,
      status: o.status
    });
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sales.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  loadSalesReport,
  exportPdf,
  exportExcel
};