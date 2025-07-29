// src/utils/exportSummaryToPDF.js

export const exportSummaryToPDF = (departments, statuses, selectedAcademicYear) => {
  // Calculate total budget
  let totalBudget = 0;
  departments.forEach((dept) => {
    totalBudget += statuses[dept.id]?.grand_total_budget || 0;
  });

  // Create the HTML content for PDF
  const printContent = `
    <html>
      <head>
        <title>Budget Proposals for Student Activities - ${selectedAcademicYear}</title>
        <style>
          body {
            font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
            font-size: 12pt;
            margin: 20px;
            padding: 10px;
          }
          h2 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
          }
          h3 {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          .total-row {
            background-color: #fff3cd;
            font-weight: bold;
          }
          .sl-no {
            text-align: center;
            width: 60px;
          }
          .budget {
            text-align: right;
            width: 150px;
          }
          .footer {
            margin-top: 100px;
            font-size: 10pt;
            color: #666;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signature {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 150px;
            margin-bottom: 5px;
          }
          .logo {
            display: block;
            margin: 0 auto 10px;
            max-height: 100px;
          }
        </style>
      </head>
      <body>
        <img src="assets/logo.png" alt="College Logo" class="logo" />
        <h2>Budget Proposals for Student Activities</h2>
        <h3>Academic Year: ${selectedAcademicYear}</h3>
        
        <table>
          <thead>
            <tr>
              <th class="sl-no">Sl. No</th>
              <th>Department</th>
              <th class="budget" >Budget Proposed</th>
            </tr>
          </thead>
          <tbody>
            ${departments.map((dept, index) => {
              const budget = statuses[dept.id]?.grand_total_budget || 0;
              return `
                <tr>
                  <td class="sl-no">${index + 1}</td>
                  <td>${dept.full_name}</td>
                  <td class="budget">₹${budget.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td class="sl-no"></td>
              <td><strong>Total Budget</strong></td>
              <td class="budget"><strong>₹${totalBudget.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div>Generated on: ${new Date().toLocaleString()}</div>
          <div class="signature">
            <div class="signature-line"></div>
            <div><strong>Principal</strong></div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open("", "_blank", "width=800,height=600");
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
