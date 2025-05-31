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
    ErrorHandler: { ...original.ErrorHandler, logError: mockErrorHandlerLogError },
  };
});

describe('ChartManager', () => {
  let ChartManagerModule: typeof import('./ChartManager');
  let chartManager: import('./ChartManager').ChartManager; // Typed instance

  // Spies for Chart.js behavior
  let mockChartInstanceDestroy: import('vitest').SpyInstance;
  let mockChartInstanceUpdate: import('vitest').SpyInstance;
  let mockChartInstanceResize: import('vitest').SpyInstance;
  let mockChartInstance: any; // Holds the mock chart object
  let MockChartConstructor: import('vitest').SpyInstance; // Spy for `new Chart()`
  let MockChartRegister: import('vitest').SpyInstance;   // Spy for `Chart.register()`

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
    mockChartInstance = {
      destroy: mockChartInstanceDestroy,
      update: mockChartInstanceUpdate,
      resize: mockChartInstanceResize,
      data: { datasets: [], labels: [] },
      options: {},
    };
    MockChartConstructor = vi.fn(() => mockChartInstance);
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
    it('should create and store a new chart instance', () => {
      const specificMockContext = { testMarker: 'specific_context_for_create_test' };
      getElementByIdSpy.mockReturnValue(mockCanvasElement);
      mockGetContextSpy.mockReturnValue(specificMockContext);

      const chart = chartManager.createChart('testCanvas', sampleChartConfig);

      expect(getElementByIdSpy).toHaveBeenCalledWith('testCanvas');
      expect(mockGetContextSpy).toHaveBeenCalledWith('2d');
      expect(MockChartConstructor).toHaveBeenCalledWith(
        specificMockContext,
        expect.objectContaining({
          type: sampleChartConfig.type,
          data: sampleChartConfig.data,
          options: expect.objectContaining(sampleChartConfig.options)
        })
      );
      expect((chartManager as any).charts.get('testCanvas')).toBe(mockChartInstance);
      expect(chart).toBe(mockChartInstance);
    });

    it('should return null and log error if canvas element is not found', () => {
      getElementByIdSpy.mockReturnValueOnce(null);
      const chart = chartManager.createChart('badCanvas', sampleChartConfig);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        "Failed to create chart for canvas: badCanvas",
        expect.objectContaining({ message: "Canvas element with id 'badCanvas' not found" })
      );
      expect(chart).toBeNull();
    });

    it('should return null and log error if canvas context cannot be obtained', () => {
      getElementByIdSpy.mockReturnValue(mockCanvasElement);
      mockGetContextSpy.mockReturnValueOnce(null);
      const chart = chartManager.createChart('ctxCanvas', sampleChartConfig);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        "Failed to create chart for canvas: ctxCanvas",
        expect.objectContaining({ message: "Could not get 2D context for canvas 'ctxCanvas'" })
      );
      expect(chart).toBeNull();
    });

    it('should destroy an existing chart with the same ID before creating a new one', () => {
      chartManager.createChart('chart1', sampleChartConfig);
      mockChartInstanceDestroy.mockClear();

      chartManager.createChart('chart1', { ...sampleChartConfig, type: 'line' });

      expect(mockChartInstanceDestroy).toHaveBeenCalled();
      expect(MockChartConstructor).toHaveBeenCalledTimes(2);
      expect((chartManager as any).charts.get('chart1')).toBe(mockChartInstance);
    });
  });

  describe('Convenience Chart Creation Methods', () => {
    const testData = { labels: ['X', 'Y'], data: [100, 200] };
    let createChartSpy: import('vitest').SpyInstance;

    beforeEach(() => {
      createChartSpy = vi.spyOn(chartManager, 'createChart');
    });

    it('createTopicChart should call createChart with pie type and specific options', () => {
      chartManager.createTopicChart('topicCanvas', testData, 'My Topics');
      expect(createChartSpy).toHaveBeenCalledWith('topicCanvas', expect.objectContaining({
        type: 'pie',
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'My Topics', display: true }) }) }),
      }));
    });

    it('createSentimentChart should call createChart with doughnut type and specific options', () => {
      chartManager.createSentimentChart('sentimentCanvas', testData, 'My Sentiment');
      expect(createChartSpy).toHaveBeenCalledWith('sentimentCanvas', expect.objectContaining({
        type: 'doughnut',
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'My Sentiment', display: true }) }) }),
      }));
    });

    it('createWordFrequencyChart should call createChart with bar type and specific options', () => {
      chartManager.createWordFrequencyChart('wordFreqCanvas', testData, 'My Word Freq');
      expect(createChartSpy).toHaveBeenCalledWith('wordFreqCanvas', expect.objectContaining({
        type: 'bar',
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'My Word Freq', display: true }) }) }),
      }));
    });

    it('createLineChart should call createChart with line type and specific options', () => {
      chartManager.createLineChart('lineCanvas', testData, 'My Line Chart');
      expect(createChartSpy).toHaveBeenCalledWith('lineCanvas', expect.objectContaining({
        type: 'line',
        options: expect.objectContaining({ plugins: expect.objectContaining({ title: expect.objectContaining({ text: 'My Line Chart', display: true }) }) }),
      }));
    });
  });

  describe('destroyChart', () => {
    it('should destroy an existing chart and remove it', () => {
      chartManager.createChart('testCanvas', sampleChartConfig);
      mockChartInstanceDestroy.mockClear();
      chartManager.destroyChart('testCanvas');
      expect(mockChartInstanceDestroy).toHaveBeenCalled();
      expect((chartManager as any).charts.has('testCanvas')).toBe(false);
    });

    it('should do nothing if chart ID does not exist', () => {
      chartManager.createChart('existingCanvas', sampleChartConfig);
      const initialChartCount = (chartManager as any).charts.size;
      mockChartInstanceDestroy.mockClear();
      chartManager.destroyChart('nonExistentCanvas');
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled();
      expect((chartManager as any).charts.size).toBe(initialChartCount);
    });
  });

  describe('destroyAllCharts', () => {
    it('should destroy all stored charts and clear the charts map', () => {
      chartManager.createChart('chart1', sampleChartConfig);
      chartManager.createChart('chart2', sampleChartConfig);
      mockChartInstanceDestroy.mockClear();
      chartManager.destroyAllCharts();
      expect(mockChartInstanceDestroy).toHaveBeenCalledTimes(2);
      expect((chartManager as any).charts.size).toBe(0);
    });
  });

  describe('getChart', () => {
    it('should return the chart instance if it exists', () => {
      chartManager.createChart('testCanvas', sampleChartConfig);
      const retrievedChart = chartManager.getChart('testCanvas');
      expect(retrievedChart).toBe(mockChartInstance);
    });

    it('should return undefined if chart ID does not exist', () => {
      expect(chartManager.getChart('nonExistentCanvas')).toBeUndefined();
    });
  });

  describe('updateChart', () => {
    const newData = { datasets: [{data: [1,2,3], label: 'New Data'}], labels: ['A','B','C'] };

    it('should update chart data and call update if chart exists', () => {
      chartManager.createChart('testCanvas', sampleChartConfig);
      mockChartInstanceUpdate.mockClear();
      // Reset data on the mockChartInstance for this specific test
      mockChartInstance.data = { datasets: [], labels: [] };

      const result = chartManager.updateChart('testCanvas', newData.labels, newData.datasets);

      expect(mockChartInstance.data.labels).toEqual(newData.labels);
      expect(mockChartInstance.data.datasets[0].data).toEqual(newData.datasets[0].data);
      expect(mockChartInstanceUpdate).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false and not call update if chart does not exist', () => {
      mockChartInstanceUpdate.mockClear();
      const result = chartManager.updateChart('nonExistentCanvas', [], []);
      expect(mockChartInstanceUpdate).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should log error and return false if chart update throws', () => {
      chartManager.createChart('testCanvas', sampleChartConfig);
      mockChartInstanceUpdate.mockClear().mockImplementationOnce(() => {
        throw new Error('Update failed');
      });
      const result = chartManager.updateChart('testCanvas', [], []);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        "Failed to update chart: testCanvas", // Corrected string
        expect.objectContaining({ message: 'Update failed' })
      );
      expect(result).toBe(false);
    });
  });

  describe('resizeChart & resizeAllCharts', () => {
    it('resizeChart should call resize on the specific chart if it exists', () => {
      chartManager.createChart('testCanvas', sampleChartConfig);
      mockChartInstanceResize.mockClear();
      chartManager.resizeChart('testCanvas');
      expect(mockChartInstanceResize).toHaveBeenCalled();
    });

    it('resizeChart should do nothing if chart does not exist', () => {
      mockChartInstanceResize.mockClear();
      chartManager.resizeChart('nonExistentCanvas');
      expect(mockChartInstanceResize).not.toHaveBeenCalled();
    });

    it('resizeAllCharts should call resize on all stored charts', () => {
      chartManager.createChart('chart1', sampleChartConfig);
      chartManager.createChart('chart2', sampleChartConfig);
      mockChartInstanceResize.mockClear();
      chartManager.resizeAllCharts();
      expect(mockChartInstanceResize).toHaveBeenCalledTimes(2);
    });
  });
});
