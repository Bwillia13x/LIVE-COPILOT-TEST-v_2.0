import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// ChartManager is imported dynamically in beforeEach
import { ChartConfig } from '../types';
import { ErrorHandler } from '../utils';

// Mock ErrorHandler (can remain a top-level vi.mock)
const mockErrorHandlerLogError = vi.fn();
vi.mock('../utils', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    ErrorHandler: {
      ...original.ErrorHandler, // Preserve other parts of ErrorHandler if any
      logError: mockErrorHandlerLogError
    },
  };
});

describe('ChartManager', () => {
  let ChartManagerModule: typeof import('./ChartManager');
  let chartManager: import('./ChartManager').ChartManager; // Typed instance

  // Spies for Chart.js behavior
  let mockChartInstanceDestroy: import('vitest').SpyInstance;
  let mockChartInstanceUpdate: import('vitest').SpyInstance;
  let mockChartInstanceResize: import('vitest').SpyInstance;
  let mockActualChartInstance: any; // Holds the object { destroy, update, resize, data, options }
  let MockChartConstructor: import('vitest').SpyInstance; // Spy for new Chart()
  let MockChartRegister: import('vitest').SpyInstance;   // Spy for Chart.register

  // Spies for DOM interactions
  let getElementByIdSpy: import('vitest').SpyInstance;
  let mockGetContextSpy: import('vitest').SpyInstance; // Spy for canvas.getContext
  let mockCanvasElement: HTMLCanvasElement;

  const sampleChartConfig: ChartConfig = {
    type: 'bar',
    data: { labels: ['A'], datasets: [{ label: 'Dataset 1', data: [10] }] },
    options: { responsive: true },
  };

  beforeEach(async () => {
    // 1. Define or reset spies for each test run
    mockChartInstanceDestroy = vi.fn();
    mockChartInstanceUpdate = vi.fn();
    mockChartInstanceResize = vi.fn();
    mockActualChartInstance = { // This is the object returned by the mocked Chart constructor
      destroy: mockChartInstanceDestroy,
      update: mockChartInstanceUpdate,
      resize: mockChartInstanceResize,
      data: { datasets: [], labels: [] }, // Initial data
      options: {},
    };
    MockChartConstructor = vi.fn(() => mockActualChartInstance);
    MockChartRegister = vi.fn();
    (MockChartConstructor as any).register = MockChartRegister;

    // 2. Mock chart.js using vi.doMock BEFORE importing ChartManager
    vi.doMock('chart.js', () => ({
      Chart: MockChartConstructor,
      LineController: vi.fn(), LineElement: vi.fn(), PointElement: vi.fn(),
      LinearScale: vi.fn(), CategoryScale: vi.fn(), BarController: vi.fn(),
      BarElement: vi.fn(), PieController: vi.fn(), ArcElement: vi.fn(),
      Legend: vi.fn(), Tooltip: vi.fn(), Title: vi.fn(),
    }));

    // 3. Dynamically import ChartManager AFTER mocks are set up
    ChartManagerModule = await import('./ChartManager');
    chartManager = new ChartManagerModule.ChartManager();

    // 4. Reset other mocks/spies
    mockErrorHandlerLogError.mockClear();

    mockGetContextSpy = vi.fn(() => ({})); // Default mock for canvas.getContext('2d')
    mockCanvasElement = {
      getContext: mockGetContextSpy,
      width: 300,
      height: 150,
    } as unknown as HTMLCanvasElement;

    if (getElementByIdSpy) getElementByIdSpy.mockRestore();
    getElementByIdSpy = vi.spyOn(document, 'getElementById');
    getElementByIdSpy.mockReturnValue(mockCanvasElement);
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('Chart.register should be called upon ChartManager module initialization', () => {
    expect(MockChartRegister).toHaveBeenCalled();
  });

  describe('createChart', () => {
    const canvasId = 'testCanvas'; // Use const for consistency
    const chartConfig: ChartConfig = { // Use const for consistency
      type: 'line',
      data: { labels: ['Jan', 'Feb'], datasets: [{ label: 'Data', data: [10, 20] }] },
      options: { responsive: true },
    };

    it('should create and store a new chart instance', () => {
      const specificMockContext = { testMarker: 'specific_context_for_create_test' };
      getElementByIdSpy.mockReturnValue(mockCanvasElement);
      mockGetContextSpy.mockReturnValue(specificMockContext);

      const chart = chartManager.createChart(canvasId, chartConfig);

      expect(getElementByIdSpy).toHaveBeenCalledWith(canvasId);
      expect(mockGetContextSpy).toHaveBeenCalledWith('2d');
      expect(MockChartConstructor).toHaveBeenCalledWith(
        specificMockContext,
        expect.objectContaining({
          type: chartConfig.type,
          data: chartConfig.data,
          // options should merge defaultOptions from ChartManager
          options: expect.objectContaining(chartConfig.options)
        })
      );
      expect(chart).toBe(mockActualChartInstance);
      expect((chartManager as any).charts.get(canvasId)).toBe(mockActualChartInstance);
    });

    it('should return null and log error if canvas element not found', () => {
      getElementByIdSpy.mockReturnValueOnce(null);
      const chart = chartManager.createChart(canvasId, chartConfig); // Use defined canvasId
      expect(chart).toBeNull();
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        `Failed to create chart for canvas: ${canvasId}`,
        expect.any(Error) // Error message is checked in source, here we check an Error object was passed
      );
    });

    it('should return null and log error if canvas context cannot be obtained', () => {
      // getElementByIdSpy will return mockCanvasElement by default from beforeEach
      mockGetContextSpy.mockReturnValueOnce(null); // Only mockGetContextSpy needs to change for this test
      const chart = chartManager.createChart(canvasId, chartConfig); // Use defined canvasId
      expect(chart).toBeNull();
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        `Failed to create chart for canvas: ${canvasId}`,
        expect.any(Error)
      );
    });

    it('should destroy an existing chart with the same canvasId before creating a new one', () => {
      chartManager.createChart(canvasId, chartConfig);
      const destroyChartSpy = vi.spyOn(chartManager, 'destroyChart'); // Spy on the method of the instance
      chartManager.createChart(canvasId, chartConfig);
      expect(destroyChartSpy).toHaveBeenCalledWith(canvasId);
      destroyChartSpy.mockRestore();
    });
  });

  describe('Convenience Chart Creation Methods', () => {
    const canvasId = 'convenienceCanvas';
    const sampleData = { labels: ['A'], data: [1] };
    let createChartSpy: import('vitest').SpyInstance;

    beforeEach(() => {
      createChartSpy = vi.spyOn(chartManager, 'createChart');
    });

    it('createTopicChart should call createChart with pie type and correct config', () => {
      chartManager.createTopicChart(canvasId, sampleData, 'Topics');
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
        type: 'pie',
        data: expect.objectContaining({ labels: sampleData.labels, datasets: expect.any(Array) }),
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'Topics' }) }) })
      }));
    });

    it('createSentimentChart should call createChart with doughnut type and correct config', () => {
      chartManager.createSentimentChart(canvasId, sampleData, 'Sentiment');
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
        type: 'doughnut',
        data: expect.objectContaining({ labels: sampleData.labels, datasets: expect.any(Array) }),
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'Sentiment' }) }) })
      }));
    });

    it('createWordFrequencyChart should call createChart with bar type and correct config', () => {
      chartManager.createWordFrequencyChart(canvasId, sampleData, 'Frequency');
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
        type: 'bar',
        data: expect.objectContaining({ labels: sampleData.labels, datasets: expect.any(Array) }),
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'Frequency' }) }) })
      }));
    });

    it('createLineChart should call createChart with line type and correct config', () => {
      chartManager.createLineChart(canvasId, sampleData, 'Line Data');
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
        type: 'line',
        data: expect.objectContaining({ labels: sampleData.labels, datasets: expect.any(Array) }),
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'Line Data' }) }) })
      }));
    });
  });

  describe('destroyChart', () => {
    it('should destroy chart and remove it from map if it exists', () => {
      const canvasId = 'destroyTest';
      chartManager.createChart(canvasId, { type: 'line', data: {}, options: {} });
      expect((chartManager as any).charts.has(canvasId)).toBe(true);
      chartManager.destroyChart(canvasId);
      expect(mockChartInstanceDestroy).toHaveBeenCalled();
      expect((chartManager as any).charts.has(canvasId)).toBe(false);
    });

    it('should do nothing if chart does not exist', () => {
      mockChartInstanceDestroy.mockClear(); // Ensure it's clear before this test
      chartManager.destroyChart('nonExistent');
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled();
    });
  });

  describe('destroyAllCharts', () => {
    it('should destroy all charts and clear the map', () => {
      chartManager.createChart('chart1', { type: 'line', data: {}, options: {} });
      chartManager.createChart('chart2', { type: 'bar', data: {}, options: {} });
      mockChartInstanceDestroy.mockClear();
      chartManager.destroyAllCharts();
      expect(mockChartInstanceDestroy).toHaveBeenCalledTimes(2);
      expect((chartManager as any).charts.size).toBe(0);
    });
  });

  describe('getChart', () => {
    it('should return chart instance if it exists', () => {
      chartManager.createChart('getTest', { type: 'line', data: {}, options: {} });
      const chart = chartManager.getChart('getTest');
      expect(chart).toBe(mockActualChartInstance);
    });

    it('should return undefined if chart does not exist', () => {
      const chart = chartManager.getChart('nonExistent');
      expect(chart).toBeUndefined();
    });
  });

  describe('updateChart', () => {
    const canvasId = 'updateTest';
    // Corrected: define newChartData with all expected properties for a full chart.data object
    const newChartData = {
      labels: ['X', 'Y'],
      datasets: [{ data: [100, 200], label: 'Updated Data' }]
    };

    it('should update chart data and call update if chart exists', () => {
      chartManager.createChart(canvasId, { type: 'line', data: {}, options: {} });
      mockChartInstanceUpdate.mockClear(); // Clear spy before action

      const result = chartManager.updateChart(canvasId, newChartData); // Pass the single object

      expect(result).toBe(true);
      expect(mockActualChartInstance.data).toEqual(newChartData); // Verify data on the mock instance
      expect(mockChartInstanceUpdate).toHaveBeenCalled();
    });

    it('should return false if chart does not exist', () => {
      mockChartInstanceUpdate.mockClear();
      const result = chartManager.updateChart('nonExistent', newChartData);
      expect(result).toBe(false);
      expect(mockChartInstanceUpdate).not.toHaveBeenCalled();
    });

    it('should log error and return false if chart update throws', () => {
      chartManager.createChart(canvasId, { type: 'line', data: {}, options: {} });
      mockChartInstanceUpdate.mockClear().mockImplementationOnce(() => { throw new Error('Update Error'); });
      const result = chartManager.updateChart(canvasId, newChartData);
      expect(result).toBe(false);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        `Failed to update chart: ${canvasId}`, // Corrected expected message
        expect.objectContaining({ message: 'Update Error' })
      );
    });
  });

  describe('resizeChart & resizeAllCharts', () => {
    it('resizeChart should call resize on the specific chart instance', () => {
      chartManager.createChart('resizeTest', { type: 'line', data: {}, options: {} });
      mockChartInstanceResize.mockClear();
      chartManager.resizeChart('resizeTest');
      expect(mockChartInstanceResize).toHaveBeenCalled();
    });

    it('resizeChart should do nothing if chart does not exist', () => {
      mockChartInstanceResize.mockClear();
      chartManager.resizeChart('nonExistent');
      expect(mockChartInstanceResize).not.toHaveBeenCalled();
    });

    it('resizeAllCharts should call resize on all chart instances', () => {
      chartManager.createChart('chart1', { type: 'line', data: {}, options: {} });
      chartManager.createChart('chart2', { type: 'bar', data: {}, options: {} });
      mockChartInstanceResize.mockClear();
      chartManager.resizeAllCharts();
      expect(mockChartInstanceResize).toHaveBeenCalledTimes(2);
    });
  });
});
