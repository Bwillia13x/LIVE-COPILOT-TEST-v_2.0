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
  // ...jest.requireActual('chart.js'), // Try removing or being more specific
  Chart: jest.fn().mockImplementation(() => mockChartInstance),
  // Ensure the static 'register' method is also mocked on the Chart constructor mock
  // And that Chart itself is what's returned for the 'Chart' named export.
  // The mock should look like: moduleFactory['Chart'] = MockedChartConstructor
  // And MockedChartConstructor.register should be a jest.fn()

  // Let's construct a more deliberate mock for Chart
  // Keep other named exports if they are directly used by ChartManager static init,
  // otherwise they might not need to be explicitly mocked if Chart.register handles them.
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
  // Add other necessary components if ChartManager.ts imports them directly for Chart.register
}));

// To fix the "Cannot access 'ActualChartJs' before initialization" error,
// we need to ensure that ActualChartJs is defined before the jest.mock factory function is executed.
// The module factory function in jest.mock gets hoisted.
// A cleaner way to do this is to define all parts of the mock and then call jest.mock once.

// Get the actual Chart.js module
// const ActualChartJs = jest.requireActual('chart.js'); // Define inside mock factory if needed

// Create our mock constructor with the static 'register' method
// const MockedChartConstructor = jest.fn(() => mockChartInstance); // Define inside mock factory
// MockedChartConstructor.register = jest.fn();
// If other static methods from Chart are needed, they can be added here:
// MockedChartConstructor.defaults = ActualChartJs.Chart.defaults; // For example

// Now, mock 'chart.js'. This will be hoisted.
jest.mock('chart.js', () => {
  // Define MockedChartConstructor and its methods *inside* the factory
  const LocalMockedChartConstructor = jest.fn(() => ({ // Return a NEW object each time
    ...mockChartInstance, // Spread properties of the global mockInstance
    // If specific instances need their own jest.fn() spies, create them here:
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
    // data will be part of ...mockChartInstance, can be overridden if needed
  }));
  LocalMockedChartConstructor.register = jest.fn();
  // If you need to reference parts of the actual Chart.js for defaults or other static props:
  // const OriginalChart = jest.requireActual('chart.js').Chart;
  // LocalMockedChartConstructor.defaults = OriginalChart.defaults;

  const originalChartJs = jest.requireActual('chart.js');

  return {
    ...originalChartJs, // Spread all actual named exports
    Chart: LocalMockedChartConstructor, // Override the 'Chart' export with our local mock
    // Explicitly list other named exports that ChartManager.ts might be importing at the top level,
    // ensuring they are also mocked or actual as needed.
    // The previous mock already listed these, so they should be covered if originalChartJs has them.
    // LineController, PointElement, etc. are part of originalChartJs.
    // Ensure all imported components in ChartManager.ts are available here
    // e.g. LineController: originalChartJs.LineController, (or jest.fn() if needs mocking)
  };
});

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
    // Use a simple dummy object for mockCtx. If Chart.js internals need specific context properties,
    // they would need to be added here. For just checking if getContext returns non-null, this is fine.
    mockCtx = { canvas: mockCanvas } as CanvasRenderingContext2D;

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
      // mockCanvas.getContext is not a spy. HTMLCanvasElement.prototype.getContext is.
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
      expect(ChartJS).toHaveBeenCalledWith(mockCtx, expect.objectContaining({ type: 'bar' }));
      // Check that the chart in the map is the one returned by createChart
      expect((chartManager as any).charts.get(canvasId)).toBe(chart);
      // Check that the returned chart is truthy (not null) and has expected mocked methods
      expect(chart).toBeTruthy();
      expect(chart!.destroy).toBeDefined(); // Ensure it's one of our new mock instances
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
      const chart = chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      expect((chartManager as any).charts.has('chart1')).toBe(true);
      expect(chart).not.toBeNull(); // Ensure chart was created

      chartManager.destroyChart('chart1');

      expect(chart!.destroy).toHaveBeenCalled(); // Check destroy on the specific instance
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
      const createdChart = chartManager.createChart('chart1', { type: 'line', data: {} } as any);
      const retrievedChart = chartManager.getChart('chart1');
      expect(retrievedChart).toBe(createdChart); // Should be the same instance
      expect(retrievedChart).toBeTruthy();
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
      const chart = chartManager.createChart(canvasId, { type: 'bar', data: initialData } as any);
      expect(chart).not.toBeNull(); // Ensure chart created
      const result = chartManager.updateChart(canvasId, newData);

      expect(result).toBe(true);
      // Check data and update on the specific instance
      expect(chart!.data).toEqual(newData);
      expect(chart!.update).toHaveBeenCalled();
    });

    it('should return false if chart not found', () => {
      const result = chartManager.updateChart('nonExistent', newData);
      expect(result).toBe(false);
      expect(ErrorHandler.logError).not.toHaveBeenCalled(); // Error handler not called if chart not found
    });

    it('should log error and return false if update fails', () => {
      const createdChart = chartManager.createChart(canvasId, { type: 'bar', data: initialData } as any);

      if (!createdChart) {
        // If createChart failed, let the assertion catch it.
        // console.error("ErrorHandler was called with (updateChart test):", (ErrorHandler.logError as jest.Mock).mock.calls); // Removed diagnostic
        expect(createdChart).not.toBeNull();
      }

      // Mock the 'update' method on the *specific instance* that was created
      // This part of the test only runs if createdChart is not null.
      (createdChart!.update as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Update failed');
      });

      const result = chartManager.updateChart(canvasId, newData);
      expect(result).toBe(false);
      // Now, this error log should be for the update failure.
      // ErrorHandler.logError would have been called twice if createChart also failed.
      // We want the *last* call to be for the update failure.
      expect(ErrorHandler.logError).toHaveBeenLastCalledWith(
          `Failed to update chart: ${canvasId}`,
          expect.any(Error)
      );
    });
  });

  describe('resizeChart', () => {
    it('should call resize on the specific chart', () => {
      const chart = chartManager.createChart('resizableChart', { type: 'line', data: {} } as any);
      if (!chart) {
        // console.error("ErrorHandler was called with (resizeChart test):", (ErrorHandler.logError as jest.Mock).mock.calls); // Removed diagnostic
        expect(chart).not.toBeNull(); // Ensure chart is created
      }
      chartManager.resizeChart('resizableChart');
      // Test that the specific chart instance's resize was called
      expect(chart!.resize).toHaveBeenCalled();
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
