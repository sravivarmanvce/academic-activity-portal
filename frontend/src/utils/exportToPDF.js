// src/utils/exportToPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (data, role, departmentName, principalRemark = "") => {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Program Counts - ${departmentName}`, 14, 15);

  const headers = [
    [
      "Activity Category",
      "Program Type",
      "Sub Type",
      "Budget Mode",
      "Count",
      "Total Budget",
      "Remarks",
    ],
  ];

  const body = [];
  const grouped = {};

  let grandCount = 0;
  let grandBudget = 0;

  data.forEach((item) => {
    const cat = item.activity_category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.entries(grouped).forEach(([category, items]) => {
    body.push([{ content: category, colSpan: 7, styles: { fillColor: [230, 230, 230] } }]);
    let subCount = 0;
    let subBudget = 0;

    items.forEach((item) => {
      body.push([
        "",
        item.program_type,
        item.sub_program_type || "-",
        item.budget_mode,
        item.count,
        item.total_budget,
        item.remarks || "",
      ]);
      subCount += item.count;
      subBudget += item.total_budget;
    });

    body.push([
      "",
      "Subtotal",
      "",
      "",
      subCount,
      subBudget,
      "",
    ]);

    grandCount += subCount;
    grandBudget += subBudget;
    body.push([]);
  });

  body.push([
    "",
    "Grand Total",
    "",
    "",
    grandCount,
    grandBudget,
    "",
  ]);

  if (role === "principal" && principalRemark) {
    body.push([]);
    body.push([{ content: `Principal Remark: ${principalRemark}`, colSpan: 7 }]);
  }

  autoTable(doc, {
    head: headers,
    body: body,
    startY: 25,
    styles: { fontSize: 10 },
  });

  doc.save(`ProgramCounts_${departmentName}.pdf`);
};
