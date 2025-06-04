Sub CreateNVIDIAPowerPointPresentation()
    '
    ' NVIDIA Strategic Assessment PowerPoint - Automated Creation
    ' This VBA script creates a professional presentation with all charts
    '
    
    Dim ppt As Presentation
    Dim sld As Slide
    Dim shp As Shape
    
    ' Create new presentation
    Set ppt = Presentations.Add
    ppt.PageSetup.SlideSize = ppSlideSizeOnScreen16x9
    
    ' Apply NVIDIA color scheme
    Call SetNVIDIAColorScheme(ppt)
    
    ' Create slides
    Call CreateTitleSlide(ppt)
    Call CreateExecutiveSummarySlide(ppt)
    Call CreateTimelineSlide(ppt)
    Call CreateRevenueSlide(ppt)
    Call CreateVRIOSlide(ppt)
    Call CreateValueChainSlide(ppt)
    Call CreateCompetitionSlide(ppt)
    Call CreateRiskSlide(ppt)
    Call CreateConclusionsSlide(ppt)
    
    ' Format all slides
    Call FormatAllSlides(ppt)
    
    MsgBox "NVIDIA Strategic Assessment PowerPoint Created Successfully!", vbInformation
    
End Sub

Sub SetNVIDIAColorScheme(ppt As Presentation)
    ' Set custom color scheme for NVIDIA branding
    With ppt.ColorSchemes.Add.Colors
        .Item(ppAccent1).RGB = RGB(31, 78, 121)    ' Primary Blue
        .Item(ppAccent2).RGB = RGB(40, 167, 69)    ' Success Green
        .Item(ppAccent3).RGB = RGB(253, 126, 20)   ' Warning Orange
        .Item(ppAccent4).RGB = RGB(111, 66, 193)   ' Info Purple
        .Item(ppAccent5).RGB = RGB(108, 117, 125)  ' Neutral Gray
        .Item(ppAccent6).RGB = RGB(90, 159, 212)   ' Secondary Blue
        .Item(ppBackground).RGB = RGB(255, 255, 255) ' White
        .Item(ppForeground).RGB = RGB(31, 78, 121)   ' NVIDIA Blue
    End With
End Sub

Sub CreateTitleSlide(ppt As Presentation)
    Dim sld As Slide
    Dim titleShape As Shape
    Dim subtitleShape As Shape
    
    Set sld = ppt.Slides.Add(1, ppLayoutTitle)
    
    ' Title
    Set titleShape = sld.Shapes.Title
    With titleShape.TextFrame.TextRange
        .Text = "NVIDIA Corporation"
        .Font.Name = "Calibri"
        .Font.Size = 44
        .Font.Bold = True
        .Font.Color.RGB = RGB(31, 78, 121)
    End With
    
    ' Subtitle
    Set subtitleShape = sld.Shapes.Placeholders(2)
    With subtitleShape.TextFrame.TextRange
        .Text = "Strategic Assessment & Future Outlook" & vbCrLf & _
                "Navigating the Apex of AI Dominance"
        .Font.Name = "Calibri"
        .Font.Size = 24
        .Font.Color.RGB = RGB(108, 117, 125)
    End With
    
    ' Add decorative elements
    Call AddNVIDIABranding(sld)
    
End Sub

Sub CreateExecutiveSummarySlide(ppt As Presentation)
    Dim sld As Slide
    Dim titleShape As Shape
    Dim contentShape As Shape
    
    Set sld = ppt.Slides.Add(2, ppLayoutText)
    
    ' Title
    Set titleShape = sld.Shapes.Title
    With titleShape.TextFrame.TextRange
        .Text = "Executive Summary: Key Performance Metrics"
        .Font.Name = "Calibri"
        .Font.Size = 28
        .Font.Bold = True
        .Font.Color.RGB = RGB(31, 78, 121)
    End With
    
    ' Create metrics table
    Call CreateMetricsTable(sld)
    
End Sub

Sub CreateTimelineSlide(ppt As Presentation)
    Dim sld As Slide
    Dim chartShape As Shape
    
    Set sld = ppt.Slides.Add(3, ppLayoutChart)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "NVIDIA Evolution: 32 Years From Graphics Pioneer to AI Dominance"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create timeline chart
    Set chartShape = sld.Shapes.AddChart2(-1, xlColumnClustered, 50, 100, 600, 400)
    Call PopulateTimelineChart(chartShape.Chart)
    Call FormatTimelineChart(chartShape.Chart)
    
End Sub

Sub CreateRevenueSlide(ppt As Presentation)
    Dim sld As Slide
    Dim chartShape As Shape
    
    Set sld = ppt.Slides.Add(4, ppLayoutChart)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "Revenue Breakdown: Data Center Dominance (FY2024: $60.9B Total)"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create pie chart
    Set chartShape = sld.Shapes.AddChart2(-1, xlPie, 50, 100, 500, 400)
    Call PopulateRevenueChart(chartShape.Chart)
    Call FormatRevenueChart(chartShape.Chart)
    
End Sub

Sub CreateVRIOSlide(ppt As Presentation)
    Dim sld As Slide
    Dim tableShape As Shape
    
    Set sld = ppt.Slides.Add(5, ppLayoutTable)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "VRIO Analysis: Sustainable Competitive Advantages"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create VRIO table
    Set tableShape = sld.Shapes.AddTable(9, 7, 50, 120, 650, 350)
    Call PopulateVRIOTable(tableShape.Table)
    Call FormatVRIOTable(tableShape.Table)
    
End Sub

Sub CreateValueChainSlide(ppt As Presentation)
    Dim sld As Slide
    Dim chartShape As Shape
    
    Set sld = ppt.Slides.Add(6, ppLayoutChart)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "Semiconductor Value Chain: The 'Smiling Curve' Strategy"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create value chain chart
    Set chartShape = sld.Shapes.AddChart2(-1, xlLineMarkers, 50, 100, 600, 400)
    Call PopulateValueChainChart(chartShape.Chart)
    Call FormatValueChainChart(chartShape.Chart)
    
End Sub

Sub CreateCompetitionSlide(ppt As Presentation)
    Dim sld As Slide
    Dim chartShape As Shape
    
    Set sld = ppt.Slides.Add(7, ppLayoutChart)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "AI Computing Market: NVIDIA's Dominant Position (95% Market Share)"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create bubble chart
    Set chartShape = sld.Shapes.AddChart2(-1, xlBubble, 50, 100, 600, 400)
    Call PopulateCompetitionChart(chartShape.Chart)
    Call FormatCompetitionChart(chartShape.Chart)
    
End Sub

Sub CreateRiskSlide(ppt As Presentation)
    Dim sld As Slide
    Dim chartShape As Shape
    
    Set sld = ppt.Slides.Add(8, ppLayoutChart)
    
    ' Title
    sld.Shapes.Title.TextFrame.TextRange.Text = "Geopolitical Risk Assessment: Managing Strategic Vulnerabilities"
    Call FormatSlideTitle(sld.Shapes.Title)
    
    ' Create risk matrix
    Set chartShape = sld.Shapes.AddChart2(-1, xlXYScatter, 50, 100, 600, 400)
    Call PopulateRiskChart(chartShape.Chart)
    Call FormatRiskChart(chartShape.Chart)
    
End Sub

Sub CreateConclusionsSlide(ppt As Presentation)
    Dim sld As Slide
    Dim titleShape As Shape
    Dim contentShape As Shape
    
    Set sld = ppt.Slides.Add(9, ppLayoutText)
    
    ' Title
    Set titleShape = sld.Shapes.Title
    With titleShape.TextFrame.TextRange
        .Text = "Strategic Recommendations & Investment Thesis"
        .Font.Name = "Calibri"
        .Font.Size = 28
        .Font.Bold = True
        .Font.Color.RGB = RGB(31, 78, 121)
    End With
    
    ' Add key recommendations
    Call AddRecommendations(sld)
    
End Sub

Sub FormatSlideTitle(titleShape As Shape)
    With titleShape.TextFrame.TextRange
        .Font.Name = "Calibri"
        .Font.Size = 24
        .Font.Bold = True
        .Font.Color.RGB = RGB(31, 78, 121)
    End With
End Sub

Sub PopulateTimelineChart(cht As Chart)
    ' Add timeline data to chart
    Dim ws As Object
    Set ws = cht.ChartData.Workbook.Worksheets(1)
    
    ' Clear existing data
    ws.Cells.Clear
    
    ' Add headers
    ws.Cells(1, 1).Value = "Year"
    ws.Cells(1, 2).Value = "Revenue ($B)"
    ws.Cells(1, 3).Value = "Market Cap ($B)"
    
    ' Add data
    ws.Cells(2, 1).Value = 1993: ws.Cells(2, 2).Value = 0.0007: ws.Cells(2, 3).Value = 0.01
    ws.Cells(3, 1).Value = 1999: ws.Cells(3, 2).Value = 0.375: ws.Cells(3, 3).Value = 1.2
    ws.Cells(4, 1).Value = 2006: ws.Cells(4, 2).Value = 2.8: ws.Cells(4, 3).Value = 8.5
    ws.Cells(5, 1).Value = 2016: ws.Cells(5, 2).Value = 6.9: ws.Cells(5, 3).Value = 25.4
    ws.Cells(6, 1).Value = 2020: ws.Cells(6, 2).Value = 26.9: ws.Cells(6, 3).Value = 323
    ws.Cells(7, 1).Value = 2023: ws.Cells(7, 2).Value = 60.9: ws.Cells(7, 3).Value = 2300
    ws.Cells(8, 1).Value = 2025: ws.Cells(8, 2).Value = 150: ws.Cells(8, 3).Value = 3000
    
    cht.SetSourceData ws.Range("A1:C8")
    
End Sub

Sub FormatTimelineChart(cht As Chart)
    With cht
        .ChartType = xlColumnClustered
        
        ' Convert Revenue to line chart on secondary axis
        .SeriesCollection(1).ChartType = xlLine
        .SeriesCollection(1).AxisGroup = xlSecondary
        .SeriesCollection(1).Format.Line.ForeColor.RGB = RGB(253, 126, 20)
        .SeriesCollection(1).MarkerStyle = xlMarkerStyleCircle
        .SeriesCollection(1).MarkerSize = 8
        
        ' Format Market Cap columns
        .SeriesCollection(2).Format.Fill.ForeColor.RGB = RGB(31, 78, 121)
        
        ' Axes
        .Axes(xlCategory).HasTitle = True
        .Axes(xlCategory).AxisTitle.Text = "Year"
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "Market Cap ($B)"
        .Axes(xlValue, xlSecondary).HasTitle = True
        .Axes(xlValue, xlSecondary).AxisTitle.Text = "Revenue ($B)"
        
        .PlotArea.Format.Fill.ForeColor.RGB = RGB(248, 249, 250)
        .ChartArea.Format.Line.Visible = False
    End With
End Sub

Sub PopulateRevenueChart(cht As Chart)
    Dim ws As Object
    Set ws = cht.ChartData.Workbook.Worksheets(1)
    
    ws.Cells.Clear
    ws.Cells(1, 1).Value = "Segment"
    ws.Cells(1, 2).Value = "Revenue ($B)"
    
    ws.Cells(2, 1).Value = "Data Center": ws.Cells(2, 2).Value = 47.5
    ws.Cells(3, 1).Value = "Gaming": ws.Cells(3, 2).Value = 7.9
    ws.Cells(4, 1).Value = "Professional Visualization": ws.Cells(4, 2).Value = 2.7
    ws.Cells(5, 1).Value = "Automotive": ws.Cells(5, 2).Value = 1.8
    ws.Cells(6, 1).Value = "OEM & Other": ws.Cells(6, 2).Value = 0.5
    
    cht.SetSourceData ws.Range("A1:B6")
End Sub

Sub FormatRevenueChart(cht As Chart)
    Dim segmentColors As Variant
    segmentColors = Array(RGB(31, 78, 121), RGB(40, 167, 69), RGB(253, 126, 20), RGB(111, 66, 193), RGB(108, 117, 125))
    
    With cht
        .ChartType = xlPie
        .SeriesCollection(1).HasDataLabels = True
        .SeriesCollection(1).DataLabels.ShowPercent = True
        .SeriesCollection(1).DataLabels.ShowValue = True
        
        Dim i As Integer
        For i = 1 To .SeriesCollection(1).Points.Count
            .SeriesCollection(1).Points(i).Format.Fill.ForeColor.RGB = segmentColors(i - 1)
        Next i
        
        .HasLegend = True
        .Legend.Position = xlLegendPositionRight
    End With
End Sub

Sub CreateMetricsTable(sld As Slide)
    Dim tableShape As Shape
    Set tableShape = sld.Shapes.AddTable(6, 3, 100, 150, 550, 200)
    
    With tableShape.Table
        ' Headers
        .Cell(1, 1).Shape.TextFrame.TextRange.Text = "Metric"
        .Cell(1, 2).Shape.TextFrame.TextRange.Text = "Value"
        .Cell(1, 3).Shape.TextFrame.TextRange.Text = "Trend"
        
        ' Data
        .Cell(2, 1).Shape.TextFrame.TextRange.Text = "Total Revenue FY2024"
        .Cell(2, 2).Shape.TextFrame.TextRange.Text = "$60.9B"
        .Cell(2, 3).Shape.TextFrame.TextRange.Text = "+126% YoY"
        
        .Cell(3, 1).Shape.TextFrame.TextRange.Text = "AI Market Share"
        .Cell(3, 2).Shape.TextFrame.TextRange.Text = "95%"
        .Cell(3, 3).Shape.TextFrame.TextRange.Text = "+15pp YoY"
        
        .Cell(4, 1).Shape.TextFrame.TextRange.Text = "Gross Margin"
        .Cell(4, 2).Shape.TextFrame.TextRange.Text = "73%"
        .Cell(4, 3).Shape.TextFrame.TextRange.Text = "+5.5pp YoY"
        
        .Cell(5, 1).Shape.TextFrame.TextRange.Text = "R&D Investment"
        .Cell(5, 2).Shape.TextFrame.TextRange.Text = "$7.3B"
        .Cell(5, 3).Shape.TextFrame.TextRange.Text = "+13% YoY"
        
        .Cell(6, 1).Shape.TextFrame.TextRange.Text = "Data Center Growth"
        .Cell(6, 2).Shape.TextFrame.TextRange.Text = "409%"
        .Cell(6, 3).Shape.TextFrame.TextRange.Text = "+350pp"
        
        ' Format table
        Call FormatMetricsTable(tableShape.Table)
    End With
End Sub

Sub FormatMetricsTable(tbl As Table)
    Dim i As Integer, j As Integer
    
    ' Format headers
    For j = 1 To 3
        With tbl.Cell(1, j).Shape.TextFrame.TextRange
            .Font.Bold = True
            .Font.Color.RGB = RGB(255, 255, 255)
        End With
        tbl.Cell(1, j).Shape.Fill.ForeColor.RGB = RGB(31, 78, 121)
    Next j
    
    ' Format data cells
    For i = 2 To 6
        For j = 1 To 3
            With tbl.Cell(i, j).Shape.TextFrame.TextRange
                .Font.Name = "Calibri"
                .Font.Size = 12
            End With
            If j = 3 Then ' Trend column - green for positive
                tbl.Cell(i, j).Shape.TextFrame.TextRange.Font.Color.RGB = RGB(40, 167, 69)
            End If
        Next j
    Next i
End Sub

Sub AddNVIDIABranding(sld As Slide)
    ' Add subtle branding elements
    Dim brandShape As Shape
    
    ' Add NVIDIA green accent bar
    Set brandShape = sld.Shapes.AddShape(msoShapeRectangle, 0, 0, 720, 10)
    With brandShape
        .Fill.ForeColor.RGB = RGB(118, 185, 0) ' NVIDIA Green
        .Line.Visible = False
    End With
    
    ' Add date/source
    Set brandShape = sld.Shapes.AddTextbox(msoTextOrientationHorizontal, 500, 500, 200, 30)
    With brandShape.TextFrame.TextRange
        .Text = "Source: Company Reports, Q4 FY2024"
        .Font.Size = 8
        .Font.Color.RGB = RGB(108, 117, 125)
    End With
End Sub

Sub FormatAllSlides(ppt As Presentation)
    Dim sld As Slide
    Dim shp As Shape
    
    For Each sld In ppt.Slides
        ' Add slide numbers
        sld.HeadersFooters.SlideNumber.Visible = True
        
        ' Format background
        sld.Background.Fill.ForeColor.RGB = RGB(255, 255, 255)
        
        ' Ensure consistent fonts
        For Each shp In sld.Shapes
            If shp.HasTextFrame Then
                If shp.TextFrame.HasText Then
                    With shp.TextFrame.TextRange.Font
                        .Name = "Calibri"
                    End With
                End If
            End If
        Next shp
    Next sld
End Sub

' Quick formatting macro for manually created charts
Sub FormatNVIDIAChart()
    Dim sld As Slide
    Dim shp As Shape
    
    Set sld = ActivePresentation.Slides(ActiveWindow.Selection.SlideRange.SlideIndex)
    
    For Each shp In sld.Shapes
        If shp.HasChart Then
            With shp.Chart
                .ChartTitle.Font.Name = "Calibri"
                .ChartTitle.Font.Size = 18
                .ChartTitle.Font.Bold = True
                .ChartTitle.Font.Color.RGB = RGB(31, 78, 121)
                
                .PlotArea.Format.Fill.ForeColor.RGB = RGB(248, 249, 250)
                .ChartArea.Format.Line.Visible = False
                
                ' Format axes
                On Error Resume Next
                .Axes(xlCategory).TickLabels.Font.Size = 10
                .Axes(xlValue).TickLabels.Font.Size = 10
                On Error GoTo 0
            End With
        End If
    Next shp
    
    MsgBox "Chart formatted with NVIDIA styling!", vbInformation
End Sub 