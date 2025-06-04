Sub CreateNVIDIACharts()
    '
    ' NVIDIA Strategic Assessment Charts - Automated Creation
    ' This VBA script creates all 6 professional charts automatically
    '
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Create worksheets
    Call CreateWorksheets
    
    ' Create all charts
    Call CreateTimelineChart
    Call CreateRevenueChart
    Call CreateVRIOTable
    Call CreateValueChainChart
    Call CreateCompetitionChart
    Call CreateRiskChart
    Call CreateDashboard
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "NVIDIA Strategic Assessment Charts Created Successfully!", vbInformation
    
End Sub

Sub CreateWorksheets()
    ' Create and name worksheets
    Dim wsNames As Variant
    Dim i As Integer
    
    wsNames = Array("Dashboard", "Timeline", "Revenue", "VRIO", "ValueChain", "Competition", "Risk")
    
    ' Delete existing sheets (except the first one)
    For i = Worksheets.Count To 2 Step -1
        Worksheets(i).Delete
    Next i
    
    ' Rename first sheet and create others
    Worksheets(1).Name = "Dashboard"
    
    For i = 1 To UBound(wsNames)
        If wsNames(i) <> "Dashboard" Then
            Worksheets.Add After:=Worksheets(Worksheets.Count)
            Worksheets(Worksheets.Count).Name = wsNames(i)
        End If
    Next i
End Sub

Sub CreateTimelineChart()
    Dim ws As Worksheet
    Set ws = Worksheets("Timeline")
    
    ' Add data headers
    ws.Range("A1").Value = "Year"
    ws.Range("B1").Value = "Revenue ($B)"
    ws.Range("C1").Value = "Market Cap ($B)"
    ws.Range("D1").Value = "Key Milestone"
    
    ' Add timeline data
    Dim timelineData As Variant
    timelineData = Array( _
        Array(1993, 0.0007, 0.01, "Company Founded"), _
        Array(1999, 0.375, 1.2, "GeForce 256 - First GPU"), _
        Array(2006, 2.8, 8.5, "CUDA Platform Launch"), _
        Array(2016, 6.9, 25.4, "Tesla P100 - AI Focus"), _
        Array(2020, 26.9, 323, "A100 Ampere"), _
        Array(2023, 60.9, 2300, "H100 Hopper - AI Dominance"), _
        Array(2025, 150, 3000, "B200 Blackwell (Projected)") _
    )
    
    ' Insert data
    Dim i As Integer
    For i = 0 To UBound(timelineData)
        ws.Cells(i + 2, 1).Value = timelineData(i)(0)
        ws.Cells(i + 2, 2).Value = timelineData(i)(1)
        ws.Cells(i + 2, 3).Value = timelineData(i)(2)
        ws.Cells(i + 2, 4).Value = timelineData(i)(3)
    Next i
    
    ' Create combination chart
    Dim chartRange As Range
    Set chartRange = ws.Range("A1:C8")
    
    Dim chartObj As ChartObject
    Set chartObj = ws.ChartObjects.Add(Left:=350, Top:=50, Width:=600, Height:=400)
    
    With chartObj.Chart
        .SetSourceData chartRange
        .ChartType = xlColumnClustered
        
        ' Convert Revenue to line chart on secondary axis
        .SeriesCollection(1).ChartType = xlLine
        .SeriesCollection(1).AxisGroup = xlSecondary
        .SeriesCollection(1).Format.Line.ForeColor.RGB = RGB(253, 126, 20) ' Orange
        .SeriesCollection(1).MarkerStyle = xlMarkerStyleCircle
        .SeriesCollection(1).MarkerSize = 8
        
        ' Format Market Cap columns
        .SeriesCollection(2).Format.Fill.ForeColor.RGB = RGB(31, 78, 121) ' Blue
        
        ' Chart formatting
        .HasTitle = True
        .ChartTitle.Text = "NVIDIA Evolution: 32 Years From Graphics Pioneer to AI Dominance"
        .ChartTitle.Font.Size = 16
        .ChartTitle.Font.Bold = True
        
        ' Axis formatting
        .Axes(xlCategory).HasTitle = True
        .Axes(xlCategory).AxisTitle.Text = "Year"
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "Market Cap ($B)"
        .Axes(xlValue, xlSecondary).HasTitle = True
        .Axes(xlValue, xlSecondary).AxisTitle.Text = "Revenue ($B)"
        
        .PlotArea.Format.Fill.ForeColor.RGB = RGB(248, 249, 250) ' Light gray
    End With
    
    ' Format data range
    ws.Range("A1:D1").Font.Bold = True
    ws.Range("A1:D8").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateRevenueChart()
    Dim ws As Worksheet
    Set ws = Worksheets("Revenue")
    
    ' Add headers
    ws.Range("A1").Value = "Segment"
    ws.Range("B1").Value = "Revenue ($B)"
    ws.Range("C1").Value = "Percentage"
    ws.Range("D1").Value = "YoY Growth (%)"
    
    ' Add revenue data
    Dim revenueData As Variant
    revenueData = Array( _
        Array("Data Center", 47.5, 78.7, 409), _
        Array("Gaming", 7.9, 13, 15), _
        Array("Professional Visualization", 2.7, 4.5, 10), _
        Array("Automotive", 1.8, 2.9, 22), _
        Array("OEM & Other", 0.5, 0.9, -24) _
    )
    
    ' Insert data
    Dim i As Integer
    For i = 0 To UBound(revenueData)
        ws.Cells(i + 2, 1).Value = revenueData(i)(0)
        ws.Cells(i + 2, 2).Value = revenueData(i)(1)
        ws.Cells(i + 2, 3).Value = revenueData(i)(2)
        ws.Cells(i + 2, 4).Value = revenueData(i)(3)
    Next i
    
    ' Create pie chart
    Dim chartRange As Range
    Set chartRange = ws.Range("A1:B6")
    
    Dim chartObj As ChartObject
    Set chartObj = ws.ChartObjects.Add(Left:=350, Top:=50, Width:=500, Height:=400)
    
    With chartObj.Chart
        .SetSourceData chartRange
        .ChartType = xlPie
        
        ' Chart formatting
        .HasTitle = True
        .ChartTitle.Text = "NVIDIA Revenue Breakdown by Segment (FY2024: $60.9B Total)"
        .ChartTitle.Font.Size = 14
        .ChartTitle.Font.Bold = True
        
        ' Data labels
        .SeriesCollection(1).HasDataLabels = True
        .SeriesCollection(1).DataLabels.ShowPercent = True
        .SeriesCollection(1).DataLabels.ShowValue = True
        
        ' Custom colors
        Dim segmentColors As Variant
        segmentColors = Array(RGB(31, 78, 121), RGB(40, 167, 69), RGB(253, 126, 20), RGB(111, 66, 193), RGB(108, 117, 125))
        
        For i = 1 To .SeriesCollection(1).Points.Count
            .SeriesCollection(1).Points(i).Format.Fill.ForeColor.RGB = segmentColors(i - 1)
        Next i
        
        .HasLegend = True
        .Legend.Position = xlLegendPositionRight
    End With
    
    ' Format data range
    ws.Range("A1:D1").Font.Bold = True
    ws.Range("A1:D6").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateVRIOTable()
    Dim ws As Worksheet
    Set ws = Worksheets("VRIO")
    
    ' Add headers
    ws.Range("A1").Value = "Strategic Resource"
    ws.Range("B1").Value = "Valuable"
    ws.Range("C1").Value = "Rare"
    ws.Range("D1").Value = "Inimitable"
    ws.Range("E1").Value = "Organized"
    ws.Range("F1").Value = "Competitive Advantage"
    ws.Range("G1").Value = "VRIO Score"
    
    ' Add VRIO data
    Dim vrioData As Variant
    vrioData = Array( _
        Array("CUDA Ecosystem & Platform", 1, 1, 1, 1, "Sustained"), _
        Array("GPU Architecture & Design IP", 1, 1, 1, 1, "Sustained"), _
        Array("AI Chip Performance Leadership", 1, 1, 0.5, 1, "Temporary"), _
        Array("Brand & Market Position", 1, 1, 0.5, 1, "Temporary"), _
        Array("Financial Resources & Cash", 1, 0, 0, 1, "Parity"), _
        Array("Manufacturing Capabilities", 1, 0, 0, 0.5, "Disadvantage"), _
        Array("R&D Capabilities & Innovation", 1, 1, 1, 1, "Sustained"), _
        Array("Partnership Network & Ecosystem", 1, 1, 0.5, 1, "Temporary") _
    )
    
    ' Insert data and formulas
    Dim i As Integer
    For i = 0 To UBound(vrioData)
        ws.Cells(i + 2, 1).Value = vrioData(i)(0)
        ws.Cells(i + 2, 2).Value = vrioData(i)(1)
        ws.Cells(i + 2, 3).Value = vrioData(i)(2)
        ws.Cells(i + 2, 4).Value = vrioData(i)(3)
        ws.Cells(i + 2, 5).Value = vrioData(i)(4)
        ws.Cells(i + 2, 6).Value = vrioData(i)(5)
        ws.Cells(i + 2, 7).Formula = "=B" & (i + 2) & "+C" & (i + 2) & "+D" & (i + 2) & "+E" & (i + 2)
    Next i
    
    ' Format table
    ws.Range("A1:G1").Font.Bold = True
    ws.Range("A1:G1").Interior.Color = RGB(31, 78, 121)
    ws.Range("A1:G1").Font.Color = RGB(255, 255, 255)
    
    ' Apply conditional formatting
    ws.Range("B2:E9").FormatConditions.Add Type:=xlCellValue, Operator:=xlEqual, Formula1:="1"
    ws.Range("B2:E9").FormatConditions(1).Interior.Color = RGB(212, 237, 218)
    
    ws.Range("B2:E9").FormatConditions.Add Type:=xlCellValue, Operator:=xlEqual, Formula1:="0"
    ws.Range("B2:E9").FormatConditions(2).Interior.Color = RGB(248, 215, 218)
    
    ws.Range("B2:E9").FormatConditions.Add Type:=xlCellValue, Operator:=xlEqual, Formula1:="0.5"
    ws.Range("B2:E9").FormatConditions(3).Interior.Color = RGB(255, 243, 205)
    
    ws.Range("A1:G9").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateValueChainChart()
    Dim ws As Worksheet
    Set ws = Worksheets("ValueChain")
    
    ' Add headers
    ws.Range("A1").Value = "Activity"
    ws.Range("B1").Value = "Margin Average (%)"
    ws.Range("C1").Value = "NVIDIA Role"
    ws.Range("D1").Value = "Strategic Importance"
    
    ' Add value chain data
    Dim chainData As Variant
    chainData = Array( _
        Array("R&D & Design", 70, "Core", "High"), _
        Array("Materials & Equipment", 50, "Partner", "Medium"), _
        Array("Manufacturing & Fab", 20, "Outsourced", "Low"), _
        Array("Assembly & Test", 30, "Partner", "Medium"), _
        Array("Systems Integration", 60, "Core", "High") _
    )
    
    ' Insert data
    Dim i As Integer
    For i = 0 To UBound(chainData)
        ws.Cells(i + 2, 1).Value = chainData(i)(0)
        ws.Cells(i + 2, 2).Value = chainData(i)(1)
        ws.Cells(i + 2, 3).Value = chainData(i)(2)
        ws.Cells(i + 2, 4).Value = chainData(i)(3)
    Next i
    
    ' Create line chart
    Dim chartRange As Range
    Set chartRange = ws.Range("A1:B6")
    
    Dim chartObj As ChartObject
    Set chartObj = ws.ChartObjects.Add(Left:=350, Top:=50, Width:=500, Height:=400)
    
    With chartObj.Chart
        .SetSourceData chartRange
        .ChartType = xlLineMarkers
        
        ' Chart formatting
        .HasTitle = True
        .ChartTitle.Text = "Semiconductor Value Chain: The 'Smiling Curve'"
        .ChartTitle.Font.Size = 14
        .ChartTitle.Font.Bold = True
        
        ' Line formatting
        .SeriesCollection(1).Format.Line.ForeColor.RGB = RGB(31, 78, 121)
        .SeriesCollection(1).Format.Line.Weight = 3
        .SeriesCollection(1).MarkerStyle = xlMarkerStyleCircle
        .SeriesCollection(1).MarkerSize = 10
        
        ' Axis formatting
        .Axes(xlCategory).HasTitle = True
        .Axes(xlCategory).AxisTitle.Text = "Value Chain Activity"
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "Margin (%)"
        .Axes(xlValue).MinimumScale = 0
        .Axes(xlValue).MaximumScale = 80
    End With
    
    ' Format data range
    ws.Range("A1:D1").Font.Bold = True
    ws.Range("A1:D6").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateCompetitionChart()
    Dim ws As Worksheet
    Set ws = Worksheets("Competition")
    
    ' Add headers
    ws.Range("A1").Value = "Company"
    ws.Range("B1").Value = "Market Share (%)"
    ws.Range("C1").Value = "Performance (TFLOPS)"
    ws.Range("D1").Value = "Revenue ($B)"
    
    ' Add competition data
    Dim compData As Variant
    compData = Array( _
        Array("NVIDIA", 95, 989, 47.5), _
        Array("AMD", 3, 1307, 1.4), _
        Array("Intel", 1, 432, 0.5), _
        Array("Google", 0.5, 800, 0), _
        Array("Others", 0.5, 400, 0.6) _
    )
    
    ' Insert data
    Dim i As Integer
    For i = 0 To UBound(compData)
        ws.Cells(i + 2, 1).Value = compData(i)(0)
        ws.Cells(i + 2, 2).Value = compData(i)(1)
        ws.Cells(i + 2, 3).Value = compData(i)(2)
        ws.Cells(i + 2, 4).Value = compData(i)(3)
    Next i
    
    ' Create bubble chart
    Dim chartRange As Range
    Set chartRange = ws.Range("A1:D6")
    
    Dim chartObj As ChartObject
    Set chartObj = ws.ChartObjects.Add(Left:=350, Top:=50, Width:=500, Height:=400)
    
    With chartObj.Chart
        .SetSourceData chartRange
        .ChartType = xlBubble
        
        ' Chart formatting
        .HasTitle = True
        .ChartTitle.Text = "AI Computing Market Competitive Landscape (2024)"
        .ChartTitle.Font.Size = 14
        .ChartTitle.Font.Bold = True
        
        ' Axis formatting
        .Axes(xlCategory).HasTitle = True
        .Axes(xlCategory).AxisTitle.Text = "Market Share (%)"
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "Performance (TFLOPS)"
        
        ' Color NVIDIA bubble gold
        .SeriesCollection(1).Points(1).Format.Fill.ForeColor.RGB = RGB(255, 215, 0)
        
        .HasLegend = True
        .Legend.Position = xlLegendPositionRight
    End With
    
    ' Format data range
    ws.Range("A1:D1").Font.Bold = True
    ws.Range("A1:D6").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateRiskChart()
    Dim ws As Worksheet
    Set ws = Worksheets("Risk")
    
    ' Add headers
    ws.Range("A1").Value = "Risk Factor"
    ws.Range("B1").Value = "Probability (1-10)"
    ws.Range("C1").Value = "Impact (1-10)"
    ws.Range("D1").Value = "Risk Level"
    ws.Range("E1").Value = "Financial Impact ($B)"
    
    ' Add risk data
    Dim riskData As Variant
    riskData = Array( _
        Array("Taiwan Strait Conflict", 7, 9, "High", 50), _
        Array("US-China Tech War", 8, 9, "High", 30), _
        Array("Supply Chain Disruption", 5, 7, "Medium", 15), _
        Array("AI Regulation", 7, 5, "Medium", 10), _
        Array("Competitor Breakthrough", 3, 6, "Low", 20), _
        Array("Semiconductor Sanctions", 5, 8, "High", 25), _
        Array("Cyber Attacks", 5, 4, "Low", 5) _
    )
    
    ' Insert data
    Dim i As Integer
    For i = 0 To UBound(riskData)
        ws.Cells(i + 2, 1).Value = riskData(i)(0)
        ws.Cells(i + 2, 2).Value = riskData(i)(1)
        ws.Cells(i + 2, 3).Value = riskData(i)(2)
        ws.Cells(i + 2, 4).Value = riskData(i)(3)
        ws.Cells(i + 2, 5).Value = riskData(i)(4)
    Next i
    
    ' Create scatter chart
    Dim chartRange As Range
    Set chartRange = ws.Range("B1:C8")
    
    Dim chartObj As ChartObject
    Set chartObj = ws.ChartObjects.Add(Left:=350, Top:=50, Width:=500, Height:=400)
    
    With chartObj.Chart
        .SetSourceData chartRange
        .ChartType = xlXYScatter
        
        ' Chart formatting
        .HasTitle = True
        .ChartTitle.Text = "NVIDIA Geopolitical Risk Assessment Matrix"
        .ChartTitle.Font.Size = 14
        .ChartTitle.Font.Bold = True
        
        ' Axis formatting
        .Axes(xlCategory).HasTitle = True
        .Axes(xlCategory).AxisTitle.Text = "Probability (1-10)"
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "Impact (1-10)"
        .Axes(xlCategory).MinimumScale = 1
        .Axes(xlCategory).MaximumScale = 10
        .Axes(xlValue).MinimumScale = 1
        .Axes(xlValue).MaximumScale = 10
        
        ' Add data labels
        .SeriesCollection(1).HasDataLabels = True
        For i = 1 To .SeriesCollection(1).Points.Count
            .SeriesCollection(1).Points(i).DataLabel.Text = ws.Cells(i + 1, 1).Value
        Next i
    End With
    
    ' Format data range
    ws.Range("A1:E1").Font.Bold = True
    ws.Range("A1:E8").Borders.LineStyle = xlContinuous
    
End Sub

Sub CreateDashboard()
    Dim ws As Worksheet
    Set ws = Worksheets("Dashboard")
    
    ' Add dashboard title
    ws.Range("A1").Value = "NVIDIA Strategic Assessment - Executive Dashboard"
    ws.Range("A1").Font.Size = 20
    ws.Range("A1").Font.Bold = True
    ws.Range("A1:F1").Merge
    ws.Range("A1").HorizontalAlignment = xlCenter
    
    ' Add key metrics table
    ws.Range("A3").Value = "Key Metrics Summary"
    ws.Range("A3").Font.Size = 14
    ws.Range("A3").Font.Bold = True
    
    ws.Range("A5").Value = "Metric"
    ws.Range("B5").Value = "Value"
    ws.Range("C5").Value = "Trend"
    ws.Range("A5:C5").Font.Bold = True
    
    Dim metricsData As Variant
    metricsData = Array( _
        Array("Total Revenue FY2024", "$60.9B", "+126% YoY"), _
        Array("AI Market Share", "95%", "+15pp YoY"), _
        Array("Gross Margin", "73%", "+5.5pp YoY"), _
        Array("R&D Investment", "$7.3B", "+13% YoY"), _
        Array("Data Center Growth", "409%", "+350pp YoY") _
    )
    
    Dim i As Integer
    For i = 0 To UBound(metricsData)
        ws.Cells(i + 6, 1).Value = metricsData(i)(0)
        ws.Cells(i + 6, 2).Value = metricsData(i)(1)
        ws.Cells(i + 6, 3).Value = metricsData(i)(2)
    Next i
    
    ws.Range("A5:C10").Borders.LineStyle = xlContinuous
    
    ' Add instructions for copying charts
    ws.Range("A13").Value = "Instructions:"
    ws.Range("A13").Font.Bold = True
    ws.Range("A14").Value = "1. Charts have been created on individual worksheets"
    ws.Range("A15").Value = "2. Copy charts from each sheet to create visual dashboard"
    ws.Range("A16").Value = "3. Arrange charts in 2x3 grid for optimal presentation"
    ws.Range("A17").Value = "4. All charts use professional NVIDIA color scheme"
    
End Sub 