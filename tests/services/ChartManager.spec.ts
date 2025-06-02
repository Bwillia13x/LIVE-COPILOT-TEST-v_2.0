import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartManager } from '../../../src/services/ChartManager';
import { AppConfig } from '../../../src/config/AppConfig'; // May not be directly used by ChartManager, but good to have if config influences charts
import { CHART_DEFAULTS, COLORS } from '../../../src/constants';
import type { ChartConfig, BaseChartData, TopicDataInput, SentimentDataInput, WordFrequencyInput } from '../../../src/types';
import type { Chart as ChartJSType, ChartType, ChartOptions, ChartData } from 'chart.js'; // Renamed to avoid conflict
import { ErrorHandler } from '../../../src/utils'; // Import ErrorHandler to mock its methods

// --- Mocks for Chart.js library ---
const mockChartInstanceDestroy = vi.fn();
const mockChartInstanceUpdate = vi.fn();
const mockChartInstanceResize = vi.fn();

const mockChartInstance = {
  destroy: mockChartInstanceDestroy,
  update: mockChartInstanceUpdate,
  resize: mockChartInstanceResize,
  data: {} as ChartData, // Add a data property
  options: {} as ChartOptions, // Add an options property
  // Add any other properties or methods of a Chart instance that ChartManager might interact with
};

const MockChartConstructor = vi.fn(() => mockChartInstance);
const mockChartRegister = vi.fn(); // Mock for Chart.register

vi.mock('chart.js', () => ({
  Chart: MockChartConstructor,
  // Mock other named exports if ChartManager uses them directly for registration
  // For now, we primarily need Chart constructor and its static register method
  // The actual controllers, elements, scales, etc., are imported in ChartManager.ts
  // but Chart.register is the key static method used.
  // So, we can just provide a spy for Chart.register.
  // If ChartManager itself was calling Chart.register(LineController, ...), we'd mock those too.
  // But it calls Chart.register(...actual imported controllers...)
  // So, mocking Chart.register itself is sufficient.
  // Let's assume ChartManager.ts does: import { Chart, LineController, ... } from 'chart.js'; Chart.register(LineController, ...);
  // Then our mock for 'chart.js' needs to export 'Chart' (which is MockChartConstructor)
  // and all other named exports that ChartManager.ts imports, because Chart.register will be called with them.
  // For simplicity, we'll make Chart.register a simple mock function.
  // The actual registration in ChartManager.ts will then call this mock.
  // We don't need to mock LineController etc. here unless we want to check *what* is registered.
  // Chart.register is a static method of the real Chart class.
  // So, our mock Chart constructor (MockChartConstructor) should have this static method.
  // However, vi.mock replaces the whole module.
  // A better way for Chart.register is to assign it as a static property to MockChartConstructor if needed,
  // or ensure the module mock exports it correctly.
  // The simplest for now:
  LineController: vi.fn(), // Placeholder if needed for Chart.register call signature
  LineElement: vi.fn(),
  PointElement: vi.fn(),
  LinearScale: vi.fn(),
  CategoryScale: vi.fn(),
  BarController: vi.fn(),
  BarElement: vi.fn(),
  PieController: vi.fn(),
  ArcElement: vi.fn(),
  Legend: vi.fn(),
  Tooltip: vi.fn(),
  Title: vi.fn(),
  // Default export if any (Chart.js typically doesn't have one)
  // The key is that ChartManager.ts will call Chart.register(...).
  // The Chart class itself should have the static method `register`.
  // So, MockChartConstructor should have it.
  // Let's adjust:
  _isMock: true, // To identify this mock module
}));
// Assign static properties to the mock constructor after vi.mock
(MockChartConstructor as any).register = mockChartRegister;


describe('ChartManager', () => {
  let chartManager: ChartManager;

  // Spies for DOM and ErrorHandler
  let getElementByIdSpy: ReturnType<typeof vi.spyOn>;
  let mockCanvasGetContextSpy: ReturnType<typeof vi.fn>;
  let logErrorSpy: ReturnType<typeof vi.spyOn<typeof ErrorHandler, 'logError'>>;


  beforeEach(() => {
    // Reset Chart.js mocks
    MockChartConstructor.mockClear();
    mockChartRegister.mockClear(); // Clear the register spy
    mockChartInstanceDestroy.mockClear();
    mockChartInstanceUpdate.mockClear();
    mockChartInstanceResize.mockClear();

    // Mock document.getElementById and canvas.getContext
    mockCanvasGetContextSpy = vi.fn().mockReturnValue({}); // Mock 2D context object
    getElementByIdSpy = vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      return {
        getContext: mockCanvasGetContextSpy,
        // Add other canvas properties if ChartManager uses them directly (e.g. width, height)
        // For now, getContext is the primary one.
      } as unknown as HTMLCanvasElement; // Cast to HTMLCanvasElement
    });

    // Mock ErrorHandler.logError
    logErrorSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {});

    chartManager = new ChartManager(); // Now instantiate with mocks in place
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restores all spies and clears mocks
  });

  describe('Constructor and Initialization', () => {
    // chartManager is instantiated in the outer beforeEach, so it's available here.

    it('should instantiate correctly', () => {
      expect(chartManager).toBeInstanceOf(ChartManager);
    });

    it('should have an empty charts map on initialization', () => {
      // Accessing private 'charts' map for testing purposes.
      expect((chartManager as any).charts.size).toBe(0);
    });

    it('should have registered Chart.js components upon module import', () => {
      // Chart.register is called at the top level of ChartManager.ts when the module is imported.
      // The mockChartRegister spy should capture this call.
      // This test implicitly relies on ChartManager being imported and its module-level code executed
      // before this test runs. Vitest's ESM module handling and vi.mock behavior ensure this.
      expect(mockChartRegister).toHaveBeenCalled();

      // Optionally, be more specific if the exact registered components are critical to verify.
      // For example, if ChartManager.ts is:
      // import { Chart, LineController, ... } from 'chart.js';
      // Chart.register(LineController, LineElement, PointElement, ...);
      // And if LineController etc. are also mocked in vi.mock('chart.js', ...), you could do:
      // const { LineController, LineElement, /*...other mocked components...*/ } = await import('chart.js');
      // expect(mockChartRegister).toHaveBeenCalledWith(LineController, LineElement, ...);
      // However, for now, just checking if it was called is sufficient to confirm initialization.
      // The current mock for 'chart.js' provides vi.fn() for these components, so we can check if it's called with them.
      const chartJS = await import('chart.js'); // Get the mocked module
      expect(mockChartRegister).toHaveBeenCalledWith(
        chartJS.LineController,
        chartJS.LineElement,
        chartJS.PointElement,
        chartJS.LinearScale,
        chartJS.CategoryScale,
        chartJS.BarController,
        chartJS.BarElement,
        chartJS.PieController,
        chartJS.ArcElement,
        chartJS.Legend,
        chartJS.Tooltip,
        chartJS.Title
      );
    });
  });

  // More setup and tests will be added in subsequent steps.

  describe('createChart()', () => {
    const canvasId = 'testCanvas';
    // mockCanvasElement and mockGetContextFn will use the spies from the outer scope (getElementByIdSpy, mockCanvasGetContextSpy)
    // logErrorSpy is also from the outer scope.
    const basicChartConfig: ChartConfig = {
      type: 'bar',
      data: { labels: ['A'], datasets: [{ label: 'Data', data: [1] }] },
      options: {},
    };

    beforeEach(() => {
      // chartManager is already new for each test due to outer beforeEach.
      // Reset mocks that are specific to createChart calls or might accumulate calls.
      MockChartConstructor.mockClear();
      mockChartInstanceDestroy.mockClear();
      getElementByIdSpy.mockClear(); // Clear calls to document.getElementById
      mockCanvasGetContextSpy.mockClear(); // Clear calls to canvas.getContext
      logErrorSpy.mockClear(); // Clear calls to ErrorHandler.logError

      // Default behavior for getElementByIdSpy for this suite: canvas is found
      // The actual mock return value for getElementById is set up in the outer beforeEach.
      // We can override it per test if needed (e.g., for canvas not found).
    });

    it('should create and store a new chart if canvas element is found', () => {
      const returnedChart = chartManager.createChart(canvasId, basicChartConfig);

      expect(getElementByIdSpy).toHaveBeenCalledWith(canvasId);
      expect(mockCanvasGetContextSpy).toHaveBeenCalledWith('2d');
      expect(MockChartConstructor).toHaveBeenCalledTimes(1);

      // ChartManager.ts passes the context (ctx) and the merged config to new Chart()
      // The merged config includes defaultOptions from ChartManager and basicChartConfig.options
      const expectedConfig = {
        type: basicChartConfig.type,
        data: basicChartConfig.data,
        options: {
          ...(chartManager as any).defaultOptions, // Accessing private defaultOptions for comparison
          ...basicChartConfig.options,
        },
      };
      expect(MockChartConstructor).toHaveBeenCalledWith(expect.anything(), expectedConfig); // expect.anything() for the context object

      expect((chartManager as any).charts.has(canvasId)).toBe(true);
      expect((chartManager as any).charts.get(canvasId)).toBe(mockChartInstance); // mockChartInstance is returned by MockChartConstructor
      expect(returnedChart).toBe(mockChartInstance);
    });

    it('should log an error and return null if canvas element is not found', () => {
      getElementByIdSpy.mockReturnValue(null); // Simulate canvas not found

      const returnedChart = chartManager.createChart(canvasId, basicChartConfig);

      expect(getElementByIdSpy).toHaveBeenCalledWith(canvasId);
      expect(mockCanvasGetContextSpy).not.toHaveBeenCalled();
      expect(MockChartConstructor).not.toHaveBeenCalled();
      expect((chartManager as any).charts.has(canvasId)).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledWith(`Failed to create chart for canvas: ${canvasId}`, expect.any(Error));
      expect(logErrorSpy.mock.calls[0][1].message).toBe(`Canvas element with id '${canvasId}' not found`);
      expect(returnedChart).toBeNull();
    });

    it('should log an error and return null if canvas getContext returns null', () => {
      // getElementByIdSpy is already configured to return a mock canvas by default from outer beforeEach
      // We just need to make its getContext method return null for this test.
      // The mockCanvasGetContextSpy is what's called by getContext() on the object returned by getElementByIdSpy.
      mockCanvasGetContextSpy.mockReturnValue(null); // Simulate getContext failing

      const returnedChart = chartManager.createChart(canvasId, basicChartConfig);

      expect(getElementByIdSpy).toHaveBeenCalledWith(canvasId);
      expect(mockCanvasGetContextSpy).toHaveBeenCalledWith('2d');
      expect(MockChartConstructor).not.toHaveBeenCalled();
      expect((chartManager as any).charts.has(canvasId)).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledWith(`Failed to create chart for canvas: ${canvasId}`, expect.any(Error));
      expect(logErrorSpy.mock.calls[0][1].message).toBe(`Could not get 2D context for canvas '${canvasId}'`);
      expect(returnedChart).toBeNull();
    });

    it('should destroy an existing chart with the same canvasId before creating a new one', () => {
      // Create first chart
      chartManager.createChart(canvasId, basicChartConfig);
      expect(MockChartConstructor).toHaveBeenCalledTimes(1);
      // mockChartInstanceDestroy should not have been called yet for the first chart
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled();


      // Act: Create second chart with the same ID
      const newConfig: ChartConfig = { ...basicChartConfig, type: 'line' };
      // MockChartConstructor needs to return a *new* mock instance for the second chart
      // so we can differentiate it from the first, if necessary.
      // For this test, it's enough that the *destroy method of the first instance* is called.
      // The global mockChartInstance.destroy (which is mockChartInstanceDestroy) will be checked.

      const returnedChart = chartManager.createChart(canvasId, newConfig);

      // Assert
      expect(mockChartInstanceDestroy).toHaveBeenCalledTimes(1); // Destroy method of the *first* instance

      expect(MockChartConstructor).toHaveBeenCalledTimes(2); // Called once for first, once for second
      const expectedNewConfig = {
        type: newConfig.type,
        data: newConfig.data,
        options: {
          ...(chartManager as any).defaultOptions,
          ...newConfig.options,
        },
      };
      expect(MockChartConstructor).toHaveBeenLastCalledWith(expect.anything(), expectedNewConfig);

      expect((chartManager as any).charts.has(canvasId)).toBe(true);
      expect((chartManager as any).charts.get(canvasId)).toBe(mockChartInstance);
      expect(returnedChart).toBe(mockChartInstance);
    });
  });

  describe('Chart Helper Methods', () => {
    let createChartSpy: ReturnType<typeof vi.spyOn>;
    const canvasId = 'helperTestCanvas';

    beforeEach(() => {
      // chartManager is new from outer beforeEach.
      // Spy on the public createChart method of the already instantiated chartManager
      createChartSpy = vi.spyOn(chartManager, 'createChart');
      // Ensure the spied createChart returns a mock chart instance to avoid issues if its return value is used.
      createChartSpy.mockReturnValue(mockChartInstance as any);


      // Ensure getElementById doesn't return null by default for these tests,
      // as createChart (which is called internally) would fail early.
      // The specific mock canvas setup is handled by the outer beforeEach's getElementByIdSpy.
      // We just need to make sure it's not returning null unless a test specifically wants that.
      // getElementByIdSpy.mockReturnValue(mockCanvasElementFromOuterScope); // This is implicitly done by outer beforeEach

      // Clear any previous calls to DOM/Error spies if necessary, though createChartSpy is the main focus.
      getElementByIdSpy.mockClear();
      mockCanvasGetContextSpy.mockClear();
      logErrorSpy.mockClear();
    });

    afterEach(() => {
      createChartSpy.mockRestore(); // Restore the original createChart method
    });

    describe('createTopicChart', () => {
      it('should call createChart with correct "pie" type and transformed data for Topic Distribution', () => {
        const topicData: TopicDataInput = { labels: ['T1', 'T2'], data: [60, 40], backgroundColor: ['red', 'blue'] };
        const expectedTitle = 'Topic Distribution';

        chartManager.createTopicChart(canvasId, topicData);

        expect(createChartSpy).toHaveBeenCalledTimes(1);
        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
          type: 'pie',
          data: {
            labels: topicData.labels,
            datasets: [expect.objectContaining({
              data: topicData.data,
              backgroundColor: topicData.backgroundColor,
              borderColor: COLORS.chartBorders, // Default from ChartManager
              borderWidth: 2,
              hoverOffset: 4,
            })],
          },
          options: expect.objectContaining({
            plugins: expect.objectContaining({
              title: expect.objectContaining({ display: true, text: expectedTitle, font: { size: 16, weight: 'bold' } }),
              legend: expect.objectContaining({ position: 'bottom' }),
            }),
          }),
        }));
      });

      it('should use default title if none provided for createTopicChart', () => {
        const topicData: TopicDataInput = { labels: ['T1'], data: [100] }; // No custom title implied
        chartManager.createTopicChart(canvasId, topicData); // No title argument

        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
            options: expect.objectContaining({
                plugins: expect.objectContaining({
                    title: expect.objectContaining({ text: 'Topic Distribution' }) // Default title
                })
            })
        }));
      });

      it('should use provided title for createTopicChart', () => {
        const topicData: TopicDataInput = { labels: ['T1'], data: [100] };
        const customTitle = "My Custom Topics";
        chartManager.createTopicChart(canvasId, topicData, customTitle);

        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
            options: expect.objectContaining({
                plugins: expect.objectContaining({
                    title: expect.objectContaining({ text: customTitle })
                })
            })
        }));
      });
    });

    describe('createSentimentChart', () => {
      it('should call createChart with correct "doughnut" type and transformed data for Sentiment Analysis using default colors', () => {
        const sentimentData: SentimentDataInput = { labels: ['Positive', 'Neutral', 'Negative'], data: [70, 20, 10] };
        const expectedTitle = 'Sentiment Analysis';

        chartManager.createSentimentChart(canvasId, sentimentData);

        expect(createChartSpy).toHaveBeenCalledTimes(1);
        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
          type: 'doughnut',
          data: {
            labels: sentimentData.labels,
            datasets: [expect.objectContaining({
              data: sentimentData.data,
              backgroundColor: CHART_DEFAULTS.SENTIMENT_CHART_COLORS, // Default from constants
              borderColor: CHART_DEFAULTS.SENTIMENT_CHART_BORDER_COLORS, // Default from constants
              borderWidth: 2,
              hoverOffset: 4,
            })],
          },
          options: expect.objectContaining({
            plugins: expect.objectContaining({
              title: expect.objectContaining({ display: true, text: expectedTitle, font: {size: CHART_DEFAULTS.DEFAULT_FONT_SIZE, weight: CHART_DEFAULTS.DEFAULT_FONT_STYLE as any } }),
              legend: expect.objectContaining({ position: 'bottom' }),
            }),
            cutout: CHART_DEFAULTS.SENTIMENT_CHART_CUTOUT,
          }),
        }));
      });

      it('should use provided background colors for createSentimentChart if available', () => {
        const customColors = ['green', 'grey', 'darkred'];
        const sentimentData: SentimentDataInput = {
            labels: ['P', 'N', 'Neg'],
            data: [50, 30, 20],
            backgroundColor: customColors
        };
        chartManager.createSentimentChart(canvasId, sentimentData);

        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
          data: expect.objectContaining({
            datasets: [expect.objectContaining({
              backgroundColor: customColors, // Should use the provided colors
            })],
          }),
        }));
      });
       it('should use default title if none provided for createSentimentChart', () => {
        const sentimentData: SentimentDataInput = { data: [10,20,70] };
        chartManager.createSentimentChart(canvasId, sentimentData);

        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
            options: expect.objectContaining({
                plugins: expect.objectContaining({
                    title: expect.objectContaining({ text: 'Sentiment Analysis' })
                })
            })
        }));
      });

      it('should use provided title for createSentimentChart', () => {
        const sentimentData: SentimentDataInput = { data: [10,20,70] };
        const customTitle = "My Moods";
        chartManager.createSentimentChart(canvasId, sentimentData, customTitle);

        expect(createChartSpy).toHaveBeenCalledWith(canvasId, expect.objectContaining({
            options: expect.objectContaining({
                plugins: expect.objectContaining({
                    title: expect.objectContaining({ text: customTitle })
                })
            })
        }));
      });
    });
  });

  describe('destroyChart()', () => {
    const canvasId = 'chartToDestroy';
    const basicChartConfig: ChartConfig = { type: 'bar', data: { labels:[], datasets:[]}};

    beforeEach(() => {
      // chartManager is new from outer beforeEach.
      // Ensure mocks are clear for each test, especially chart instance mocks
      // MockChartConstructor is cleared in outer beforeEach.
      mockChartInstanceDestroy.mockClear();
      // getElementByIdSpy is set up in outer beforeEach to return a mock canvas by default.
      // logErrorSpy is also from outer beforeEach.
    });

    it('should call destroy on the chart instance and remove it from the active charts map', () => {
      // Arrange: Create a chart first
      // The default getElementByIdSpy will make createChart succeed.
      chartManager.createChart(canvasId, basicChartConfig);
      expect((chartManager as any).charts.has(canvasId)).toBe(true); // Verify it's there
      // mockChartInstance is returned by MockChartConstructor, so mockChartInstanceDestroy is its destroy spy.

      // Act
      chartManager.destroyChart(canvasId);

      // Assert
      expect(mockChartInstanceDestroy).toHaveBeenCalledTimes(1);
      expect((chartManager as any).charts.has(canvasId)).toBe(false);
    });

    it('should do nothing if the canvasId does not exist in the active charts map', () => {
      const unknownId = 'unknownCanvasId';
      // Pre-condition: chart with unknownId does not exist
      expect((chartManager as any).charts.has(unknownId)).toBe(false);

      // Act
      chartManager.destroyChart(unknownId);

      // Assert
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled(); // No destroy should be called
      // Check that the size of the charts map is what it was before (e.g. 0 if it was empty)
      const initialSize = (chartManager as any).charts.size;
      chartManager.destroyChart(unknownId);
      expect((chartManager as any).charts.size).toBe(initialSize);
    });

    it('should not throw an error if called with an undefined or null canvasId', () => {
      // ChartManager.ts: if (chart) { chart.destroy(); this.charts.delete(canvasId); }
      // If canvasId is null/undefined, chart will be undefined. So, no error.
      expect(() => chartManager.destroyChart(null as any)).not.toThrow();
      expect(() => chartManager.destroyChart(undefined as any)).not.toThrow();
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled();
    });
  });

  describe('destroyAllCharts()', () => {
    const chartId1 = 'chart1';
    const chartId2 = 'chart2';
    const basicChartConfig: ChartConfig = { type: 'bar', data: { labels:[], datasets:[]}};

    beforeEach(() => {
      // chartManager is new from outer beforeEach.
      // MockChartConstructor and mockChartInstanceDestroy are cleared in outer beforeEach.
      // getElementByIdSpy is set up in outer beforeEach to return a mock canvas by default.
    });

    it('should call destroy on all active chart instances and clear the active charts map', () => {
      // Arrange: Create multiple charts
      // ChartManager.createChart stores the same mockChartInstance under different keys.
      // The destroy method called will be mockChartInstanceDestroy.
      chartManager.createChart(chartId1, basicChartConfig);
      chartManager.createChart(chartId2, basicChartConfig);
      expect((chartManager as any).charts.size).toBe(2);
      mockChartInstanceDestroy.mockClear(); // Clear any destroy calls from createChart if it replaced charts with same ID (not the case here)

      // Act
      chartManager.destroyAllCharts();

      // Assert
      // mockChartInstance.destroy should be called for each chart instance stored.
      // Since both chartId1 and chartId2 store the same mockChartInstance,
      // its destroy method (mockChartInstanceDestroy) will be called twice.
      expect(mockChartInstanceDestroy).toHaveBeenCalledTimes(2);
      expect((chartManager as any).charts.size).toBe(0);
    });

    it('should do nothing if there are no active charts', () => {
      expect((chartManager as any).charts.size).toBe(0); // Pre-condition

      // Act
      chartManager.destroyAllCharts();

      // Assert
      expect(mockChartInstanceDestroy).not.toHaveBeenCalled();
      expect((chartManager as any).charts.size).toBe(0);
    });
  });
});
