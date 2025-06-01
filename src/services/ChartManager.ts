/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title,
} from 'chart.js';
import { ChartConfig, BaseChartData, TopicDataInput, SentimentDataInput, WordFrequencyInput, ChartDataset } from '../types/index.js';
import { COLORS, CHART_DEFAULTS } from '../constants.js'; // Import CHART_DEFAULTS
import { ErrorHandler } from '../utils.js';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title
);

export class ChartManager {
  private charts: Map<string, Chart> = new Map();
  private readonly defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
      },
    },
  };

  public createChart(canvasId: string, config: ChartConfig): Chart | null {
    try {
      // Destroy existing chart if it exists
      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas element with id '${canvasId}' not found`);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Could not get 2D context for canvas '${canvasId}'`);
      }

      const chartConfig = {
        type: config.type,
        data: config.data,
        options: {
          ...this.defaultOptions,
          ...config.options,
        },
      };

      const chart = new Chart(ctx, chartConfig);
      this.charts.set(canvasId, chart);
      
      return chart;
    } catch (error) {
      ErrorHandler.logError(`Failed to create chart for canvas: ${canvasId}`, error);
      return null;
    }
  }

  public createTopicChart(canvasId: string, inputData: TopicDataInput, title: string = 'Topic Distribution'): Chart | null {
    const chartData: BaseChartData = {
      labels: inputData.labels || [],
      datasets: [{
        data: inputData.data || [],
        backgroundColor: inputData.backgroundColor || COLORS.chartBackgrounds,
        borderColor: COLORS.chartBorders, // Default border color
        borderWidth: 2,
        hoverOffset: 4, // Example of a common dataset property
      } as ChartDataset], // Type assertion for the dataset object
    };

    const config: ChartConfig = {
      type: 'pie',
      data: chartData,
      options: { // Options can be further typed using Chart.js ChartOptions if needed
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  public createSentimentChart(canvasId: string, inputData: SentimentDataInput, title: string = 'Sentiment Analysis'): Chart | null {
    const chartData: BaseChartData = {
      labels: inputData.labels || ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: inputData.data || [0, 0, 0],
        backgroundColor: inputData.backgroundColor || CHART_DEFAULTS.SENTIMENT_CHART_COLORS,
        borderColor: CHART_DEFAULTS.SENTIMENT_CHART_BORDER_COLORS,
        borderWidth: 2,
        hoverOffset: 4,
      } as ChartDataset],
    };

    const config: ChartConfig = {
      type: 'doughnut',
      data: chartData,
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: CHART_DEFAULTS.DEFAULT_FONT_SIZE, weight: CHART_DEFAULTS.DEFAULT_FONT_STYLE as 'normal' | 'bold' | 'lighter' | 'bolder' | undefined },
          },
          legend: {
            position: 'bottom',
          },
        },
        cutout: CHART_DEFAULTS.SENTIMENT_CHART_CUTOUT,
      },
    };

    return this.createChart(canvasId, config);
  }

  public createWordFrequencyChart(canvasId: string, inputData: WordFrequencyInput, title: string = 'Word Frequency'): Chart | null {
    const chartData: BaseChartData = {
      labels: inputData.labels || [],
      datasets: [{
        label: 'Frequency',
        data: inputData.data || [],
        backgroundColor: inputData.backgroundColor || COLORS.chartBackgrounds,
        borderColor: COLORS.chartBorders,
        borderWidth: 1,
      } as ChartDataset],
    };

    const config: ChartConfig = {
      type: 'bar',
      data: chartData,
      options: { // Options can be further typed
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: CHART_DEFAULTS.DEFAULT_FONT_SIZE, weight: CHART_DEFAULTS.DEFAULT_FONT_STYLE as 'normal' | 'bold' | 'lighter' | 'bolder' | undefined },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Frequency',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Words',
            },
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Assuming data for createLineChart matches BaseChartData structure directly for simplicity,
  // or a new LineChartInput type could be created if its input structure is different.
  public createLineChart(canvasId: string, chartData: BaseChartData, title: string = 'Line Chart'): Chart | null {
    // Ensure datasets have default styling if not provided
    const styledDatasets = chartData.datasets.map(ds => ({
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primaryLight,
      borderWidth: 2,
      fill: false,
      ...ds, // Spread existing dataset properties, potentially overriding defaults
    }));

    const config: ChartConfig = {
      type: 'line',
      data: {
        ...chartData,
        datasets: styledDatasets,
      },
      options: { // Options can be further typed
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: CHART_DEFAULTS.DEFAULT_FONT_SIZE, weight: CHART_DEFAULTS.DEFAULT_FONT_STYLE as 'normal' | 'bold' | 'lighter' | 'bolder' | undefined },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  public destroyChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  public destroyAllCharts(): void {
    this.charts.forEach((chart, canvasId) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  public getChart(canvasId: string): Chart | undefined {
    return this.charts.get(canvasId);
  }

  public updateChart(canvasId: string, newData: any): boolean {
    try {
      const chart = this.charts.get(canvasId);
      if (!chart) {
        return false;
      }

      chart.data = newData;
      chart.update();
      return true;
    } catch (error) {
      ErrorHandler.logError(`Failed to update chart: ${canvasId}`, error);
      return false;
    }
  }

  public resizeChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.resize();
    }
  }

  public resizeAllCharts(): void {
    this.charts.forEach(chart => {
      chart.resize();
    });
  }
}
