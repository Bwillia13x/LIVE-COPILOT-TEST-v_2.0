// src/services/ChartManager.test.ts

import { ChartManager } from './ChartManager';
import { Chart as ChartJS, ChartConfiguration, ChartTypeRegistry } from 'chart.js'; // Import ChartJS
import { ErrorHandler } from '../utils'; // Assuming ErrorHandler is in utils

// Mock Chart.js
const mockChartInstance = {
  destroy: jest.fn(),
  update: jest.fn(),
  resize: jest.fn(),
  data: {},
};
jest.mock('chart.js', () => ({
  ...jest.requireActual('chart.js'), // import and retain default behavior
  Chart: jest.fn().mockImplementation(() => mockChartInstance),
  // Mock any other specific Chart.js named exports if needed by ChartManager's top-level registration
  LineController: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  LinearScale: jest.fn(),
  CategoryScale: jest.fn(),
  BarController: jest.fn(),
  BarElement: jest.fn(),
  PieController: jest.fn(),
  ArcElement: jest.fn(),
  Legend: jest.fn(),
  Tooltip: jest.fn(),
  Title: jest.fn(),
}));

// Mock ErrorHandler
jest.mock('../utils', () => ({
  ErrorHandler: {
    logError: jest.fn(),
  },
}));

describe('ChartManager', () => {
  let chartManager: ChartManager;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    chartManager = new ChartManager();
    mockCanvas = document.createElement('canvas');
    mockCtx = mockCanvas.getContext('2d')!; // Non-null assertion

    // Reset mocks before each test
    (ChartJS as jest.Mock).mockClear();
    mockChartInstance.destroy.mockClear();
    mockChartInstance.update.mockClear();
    mockChartInstance.resize.mockClear();
    (ErrorHandler.logError as jest.Mock).mockClear();

    // Mock document.getElementById
    document.getElementById = jest.fn().mockReturnValue(mockCanvas);
    // Mock canvas.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx);
  });

  describe('constructor', () => {
    it('should initialize an empty charts map', () => {
      expect((chartManager as any).charts.size).toBe(0);
    });
  });

  describe('createChart', () => {
    const canvasId = 'testChart';
    const chartConfig: ChartConfiguration<keyof ChartTypeRegistry, any[], any> = { // Use ChartConfiguration
      type: 'bar',
      data: { labels: ['A'], datasets: [{ data: [1] }] },
    };

    it('should create and store a new chart', () => {
      const chart = chartManager.createChart(canvasId, chartConfig as any); // Use 'as any' for simplified config
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(ChartJS).toHaveBeenCalledWith(mockCtx, expect.objectContaining({ type: 'bar' }));
      expect((chartManager as any).charts.get(canvasId)).toBe(mockChartInstance);
      expect(chart).toBe(mockChartInstance);
    });

    it('should destroy an existing chart with the same canvasId before creating a new one', () => {
      // Create first chart
      chartManager.createChart(canvasId, chartConfig as any);
      const firstChartInstance = (chartManager as any).charts.get(canvasId);
      expect(firstChartInstance).toBeDefined();

      // Spy on the destroy method of the *specific instance* if possible,
      // otherwise, we rely on the global mockChartInstance.destroy
      const destroySpy = jest.spyOn(firstChartInstance!, 'destroy');

      // Create second chart with the same ID
      chartManager.createChart(canvasId, chartConfig as any);
      expect(destroySpy).toHaveBeenCalled();
      expect((chartManager as any).charts.get(canvasId)).not.toBe(firstChartInstance); // New instance
    });

    it('should return null and log error if canvas element is not found', () => {
      (document.getElementById as jest.Mock).mockReturnValue(null);
      const chart = chartManager.createChart(canvasId, chartConfig as any);
      expect(chart).toBeNull();
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        `Failed to create chart for canvas: ${canvasId}`,
        expect.any(Error)
      );
    });

    it('should return null and log error if canvas context cannot be obtained', () => {
      (HTMLCanvasElement.prototype.getContext as jest.Mock).mockReturnValue(null);
      const chart = chartManager.createChart(canvasId, chartConfig as any);
      expect(chart).toBeNull();
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        `Failed to create chart for canvas: ${canvasId}`,
        expect.any(Error)
      );
    });
  });

  describe('Specific Chart Creators', () => {
    const canvasId = 'specificChart';
    const sampleData = { labels: ['X', 'Y'], data: [10, 20] };

    it('createTopicChart should call createChart with pie type', () => {
      const createChartSpy = jest.spyOn(chartManager, 'createChart');
      chartManager.createTopicChart(canvasId, sampleData);
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({ type: 'pie' }));
    });

    it('createSentimentChart should call createChart with doughnut type', () => {
      const createChartSpy = jest.spyOn(chartManager, 'createChart');
      chartManager.createSentimentChart(canvasId, sampleData);
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({ type: 'doughnut' }));
    });

    it('createWordFrequencyChart should call createChart with bar type', () => {
      const createChartSpy = jest.spyOn(chartManager, 'createChart');
      chartManager.createWordFrequencyChart(canvasId, sampleData);
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({ type: 'bar' }));
    });

    it('createLineChart should call createChart with line type', () => {
      const createChartSpy = jest.spyOn(chartManager, 'createChart');
      chartManager.createLineChart(canvasId, sampleData);
      expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({ type: 'line' }));
    });
  });

  describe('destroyChart', () => {
    it('should destroy the chart and remove it from the map', () => {
      chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      expect((chartManager as any).charts.has('chart1')).toBe(true);

      chartManager.destroyChart('chart1');

      expect(mockChartInstance.destroy).toHaveBeenCalled();
      expect((chartManager as any).charts.has('chart1')).toBe(false);
    });

    it('should not throw if chart does not exist', () => {
      expect(() => chartManager.destroyChart('nonExistentChart')).not.toThrow();
      expect(mockChartInstance.destroy).not.toHaveBeenCalled(); // Since it was cleared
    });
  });

  describe('destroyAllCharts', () => {
    it('should destroy all charts and clear the map', () => {
      chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      const chart1Instance = (chartManager as any).charts.get('chart1');
      const chart1DestroySpy = jest.spyOn(chart1Instance!, 'destroy');

      // Create a second chart to ensure 'all' are destroyed
      // We need a new mock instance for the second chart for individual spy
      const mockChartInstance2 = { destroy: jest.fn(), update: jest.fn(), resize: jest.fn(), data: {} };
      (ChartJS as jest.Mock).mockReturnValueOnce(mockChartInstance2);
      chartManager.createChart('chart2', { type: 'bar', data: {} } as any);
      const chart2Instance = (chartManager as any).charts.get('chart2');
      const chart2DestroySpy = jest.spyOn(chart2Instance!, 'destroy');

      expect((chartManager as any).charts.size).toBe(2);

      chartManager.destroyAllCharts();

      expect(chart1DestroySpy).toHaveBeenCalled();
      expect(chart2DestroySpy).toHaveBeenCalled();
      expect((chartManager as any).charts.size).toBe(0);
    });
  });

  describe('getChart', () => {
    it('should return the chart instance if it exists', () => {
      chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      const chart = chartManager.getChart('chart1');
      expect(chart).toBe(mockChartInstance);
    });

    it('should return undefined if the chart does not exist', () => {
      const chart = chartManager.getChart('nonExistentChart');
      expect(chart).toBeUndefined();
    });
  });

  describe('updateChart', () => {
    const canvasId = 'updateableChart';
    const initialData = { labels: ['A'], datasets: [{ data: [1] }] };
    const newData = { labels: ['B'], datasets: [{ data: [2] }] };

    it('should update chart data and call chart.update()', () => {
      chartManager.createChart(canvasId, { type: 'bar', data: initialData } as any);
      const result = chartManager.updateChart(canvasId, newData);

      expect(result).toBe(true);
      expect(mockChartInstance.data).toEqual(newData);
      expect(mockChartInstance.update).toHaveBeenCalled();
    });

    it('should return false if chart not found', () => {
      const result = chartManager.updateChart('nonExistent', newData);
      expect(result).toBe(false);
      expect(ErrorHandler.logError).not.toHaveBeenCalled(); // Error handler not called if chart not found
    });

    it('should log error and return false if update fails', () => {
      chartManager.createChart(canvasId, { type: 'bar', data: initialData } as any);
      mockChartInstance.update.mockImplementationOnce(() => {
        throw new Error('Update failed');
      });
      const result = chartManager.updateChart(canvasId, newData);
      expect(result).toBe(false);
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
          `Failed to update chart: ${canvasId}`,
          expect.any(Error)
      );
    });
  });

  describe('resizeChart', () => {
    it('should call resize on the specific chart', () => {
      chartManager.createChart('resizableChart', { type: 'line', data: {} } as any);
      chartManager.resizeChart('resizableChart');
      expect(mockChartInstance.resize).toHaveBeenCalled();
    });

    it('should not throw if chart does not exist', () => {
      expect(() => chartManager.resizeChart('nonExistent')).not.toThrow();
      expect(mockChartInstance.resize).not.toHaveBeenCalled();
    });
  });

  describe('resizeAllCharts', () => {
    it('should call resize on all managed charts', () => {
      chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      const chart1Instance = chartManager.getChart('chart1');
      const chart1ResizeSpy = jest.spyOn(chart1Instance!, 'resize');

      const mockChartInstance2 = { destroy: jest.fn(), update: jest.fn(), resize: jest.fn(), data: {} };
      (ChartJS as jest.Mock).mockReturnValueOnce(mockChartInstance2);
      chartManager.createChart('chart2', { type: 'bar', data: {} } as any);
      const chart2Instance = chartManager.getChart('chart2');
      const chart2ResizeSpy = jest.spyOn(chart2Instance!, 'resize');

      chartManager.resizeAllCharts();

      expect(chart1ResizeSpy).toHaveBeenCalled();
      expect(chart2ResizeSpy).toHaveBeenCalled();
    });
  });
});
