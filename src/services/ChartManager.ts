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
import { ChartConfig } from '../types';
import { COLORS } from '../constants';
import { ErrorHandler } from '../utils';

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

  public createTopicChart(canvasId: string, data: any, title: string = 'Topic Distribution'): Chart | null {
    const config: ChartConfig = {
      type: 'pie',
      data: {
        labels: data.labels || [],
        datasets: [{
          data: data.data || [],
          backgroundColor: data.backgroundColor || COLORS.chartBackgrounds,
          borderColor: COLORS.chartBorders,
          borderWidth: 2,
        }],
      },
      options: {
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

  public createSentimentChart(canvasId: string, data: any, title: string = 'Sentiment Analysis'): Chart | null {
    const config: ChartConfig = {
      type: 'doughnut',
      data: {
        labels: data.labels || ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: data.data || [0, 0, 0],
          backgroundColor: data.backgroundColor || ['#4CAF50', '#FFC107', '#F44336'],
          borderColor: ['#388E3C', '#F57C00', '#D32F2F'],
          borderWidth: 2,
        }],
      },
      options: {
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
        cutout: '50%',
      },
    };

    return this.createChart(canvasId, config);
  }

  public createWordFrequencyChart(canvasId: string, data: any, title: string = 'Word Frequency'): Chart | null {
    const config: ChartConfig = {
      type: 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Frequency',
          data: data.data || [],
          backgroundColor: data.backgroundColor || COLORS.chartBackgrounds,
          borderColor: COLORS.chartBorders,
          borderWidth: 1,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
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

  public createLineChart(canvasId: string, data: any, title: string = 'Line Chart'): Chart | null {
    const config: ChartConfig = {
      type: 'line',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: data.label || 'Data',
          data: data.data || [],
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryLight,
          borderWidth: 2,
          fill: false,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
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
