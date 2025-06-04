# How to Automatically Create NVIDIA Excel Charts

## Quick Start Guide

### **Step 1: Open Excel and Enable Macros**
1. Open Microsoft Excel
2. Create a new blank workbook
3. Save as `.xlsm` format (Excel Macro-Enabled Workbook)
4. Go to `File` > `Options` > `Trust Center` > `Trust Center Settings`
5. Select `Macro Settings` and enable "Enable all macros"

### **Step 2: Add the VBA Code**
1. Press `Alt + F11` to open VBA Editor
2. Right-click on `VBAProject` in the left panel
3. Select `Insert` > `Module`
4. Copy all the code from `Excel_Automation_Script.vba`
5. Paste it into the module window

### **Step 3: Run the Automation**
1. Press `F5` or go to `Run` > `Run Sub/UserForm`
2. Select `CreateNVIDIACharts` from the dropdown
3. Click `Run`

### **Expected Results:**
- ✅ 7 worksheets created automatically
- ✅ All data populated with NVIDIA metrics
- ✅ 6 professional charts generated
- ✅ VRIO analysis table with conditional formatting
- ✅ Dashboard with key metrics summary
- ✅ Professional NVIDIA color scheme applied

---

## What Gets Created Automatically:

### **1. Timeline Sheet**
- Evolution timeline chart (1993-2025)
- Combination chart: Revenue line + Market Cap columns
- Key milestones labeled
- Professional blue/orange color scheme

### **2. Revenue Sheet**
- Pie chart with segment breakdown
- Custom colors for each segment
- Data labels with percentages and values
- Legend with segment descriptions

### **3. VRIO Sheet**
- Strategic resource analysis table
- Conditional formatting for Yes/No/Partial
- VRIO scoring formulas
- Professional matrix layout

### **4. ValueChain Sheet**
- "Smiling Curve" line chart
- Margin analysis across value chain
- NVIDIA positioning highlighted
- Activity-based strategic importance

### **5. Competition Sheet**
- Bubble chart for market positioning
- Company performance comparison
- Market share vs TFLOPS visualization
- Color-coded competitive landscape

### **6. Risk Sheet**
- Scatter plot risk matrix
- Probability vs Impact analysis
- Geopolitical risk assessment
- Financial impact sizing

### **7. Dashboard Sheet**
- Executive summary metrics
- Key performance indicators
- Instructions for chart arrangement
- Professional layout

---

## Manual Alternative (If VBA Doesn't Work):

### **Option A: Import CSV Data**
1. Open the `NVIDIA_Charts_Data.csv` file
2. Copy data sections to respective Excel sheets
3. Follow the step-by-step instructions in `NVIDIA_Excel_Charts_Instructions.md`

### **Option B: Use Existing Data File**
1. Open `NVIDIA_Charts_Data.xlsx`
2. Manually create charts using the provided data
3. Follow formatting guidelines for professional appearance

---

## Troubleshooting:

### **If Macros Are Disabled:**
- Go to `File` > `Options` > `Trust Center`
- Enable macros and restart Excel

### **If Charts Don't Appear Correctly:**
- Check data ranges in each sheet
- Verify chart types match specifications
- Apply custom colors manually if needed

### **If VBA Code Errors:**
- Ensure Excel version supports VBA
- Check for typos in the copied code
- Run each subroutine individually for debugging

---

## Final Steps:

1. **Review all charts** for accuracy and formatting
2. **Copy charts to Dashboard** for unified view
3. **Adjust sizes and positions** as needed
4. **Export as PDF** for presentations
5. **Save the workbook** for future updates

---

## Professional Tips:

- Use consistent fonts (Calibri) throughout
- Maintain NVIDIA color palette (#1f4e79, #28a745, etc.)
- Add data source citations to each chart
- Include chart descriptions and key insights
- Test chart compatibility with PowerPoint
- Create high-resolution exports for printing

The automation creates professional, McKinsey-style charts that match the quality of the original HTML presentation while being fully editable in Excel. 