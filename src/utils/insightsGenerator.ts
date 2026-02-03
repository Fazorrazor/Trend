import { TrendData } from '../types/ticket';

interface TrendInsight {
  severity: 'critical' | 'warning' | 'positive' | 'neutral';
  title: string;
  message: string;
  recommendation?: string;
  icon: 'alert' | 'warning' | 'success' | 'info';
}

interface TrendPattern {
  isIncreasing: boolean;
  isDecreasing: boolean;
  isVolatile: boolean;
  isStable: boolean;
  momentum: 'accelerating' | 'decelerating' | 'steady';
}

/**
 * Analyzes trend patterns to understand the story behind the data
 */
function analyzeTrendPattern(data: TrendData[]): TrendPattern {
  if (data.length < 2) {
    return {
      isIncreasing: false,
      isDecreasing: false,
      isVolatile: false,
      isStable: true,
      momentum: 'steady'
    };
  }

  // Calculate changes between consecutive periods
  const changes = data.slice(1).map((item, idx) => item.count - data[idx].count);
  const positiveChanges = changes.filter(c => c > 0).length;
  const negativeChanges = changes.filter(c => c < 0).length;
  
  // Calculate volatility (standard deviation of changes)
  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);
  const avgVolume = data.reduce((sum, d) => sum + d.count, 0) / data.length;
  const volatilityRatio = volatility / avgVolume;

  // Analyze momentum (are changes getting bigger or smaller?)
  let momentum: 'accelerating' | 'decelerating' | 'steady' = 'steady';
  if (changes.length >= 3) {
    const recentChanges = changes.slice(-3).map(Math.abs);
    const earlierChanges = changes.slice(0, -3).map(Math.abs);
    const recentAvg = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
    const earlierAvg = earlierChanges.length > 0 
      ? earlierChanges.reduce((a, b) => a + b, 0) / earlierChanges.length 
      : recentAvg;
    
    if (recentAvg > earlierAvg * 1.3) momentum = 'accelerating';
    else if (recentAvg < earlierAvg * 0.7) momentum = 'decelerating';
  }

  return {
    isIncreasing: positiveChanges > negativeChanges && avgChange > 0,
    isDecreasing: negativeChanges > positiveChanges && avgChange < 0,
    isVolatile: volatilityRatio > 0.3,
    isStable: volatilityRatio < 0.15,
    momentum
  };
}

/**
 * Generates human-like insights for weekly trends
 */
export function generateWeeklyInsights(weeklyTrend: TrendData[]): TrendInsight[] {
  if (weeklyTrend.length < 2) {
    return [{
      severity: 'neutral',
      title: 'Insufficient Data',
      message: 'Need at least 2 weeks of data to generate meaningful insights.',
      icon: 'info'
    }];
  }

  const insights: TrendInsight[] = [];
  const latest = weeklyTrend[weeklyTrend.length - 1];
  const previous = weeklyTrend[weeklyTrend.length - 2];
  const first = weeklyTrend[0];
  const change = latest.count - previous.count;
  const percentChange = previous.count > 0 ? ((change / previous.count) * 100) : 0;
  const average = weeklyTrend.reduce((sum, w) => sum + w.count, 0) / weeklyTrend.length;
  const pattern = analyzeTrendPattern(weeklyTrend);

  // Week-over-week analysis with context
  if (Math.abs(change) > 0) {
    const magnitude = Math.abs(percentChange);
    let severity: TrendInsight['severity'] = 'neutral';
    let title = '';
    let message = '';
    let recommendation = '';

    if (change > 0) {
      // Increasing tickets - concerning
      if (magnitude > 50) {
        severity = 'critical';
        title = '🚨 Significant Spike Detected';
        message = `Ticket volume surged by ${Math.abs(change)} tickets (${magnitude.toFixed(0)}% increase) in ${latest.period}. This is a major deviation from normal patterns.`;
        recommendation = 'Immediate investigation recommended. Check for system outages, new deployments, or emerging issues affecting multiple users.';
      } else if (magnitude > 20) {
        severity = 'warning';
        title = '⚠️ Notable Increase in Volume';
        message = `${latest.period} saw ${Math.abs(change)} more tickets than ${previous.period} (${magnitude.toFixed(1)}% increase). This uptick warrants attention.`;
        recommendation = 'Review recent changes, monitor for patterns, and consider allocating additional support resources if trend continues.';
      } else {
        severity = 'warning';
        title = '📈 Slight Uptick Observed';
        message = `Ticket volume increased modestly by ${Math.abs(change)} tickets (${magnitude.toFixed(1)}%) in ${latest.period}.`;
        recommendation = pattern.momentum === 'accelerating' 
          ? 'Monitor closely - this could be the start of a larger trend.'
          : 'Normal fluctuation, but keep an eye on it.';
      }
    } else {
      // Decreasing tickets - positive
      if (magnitude > 50) {
        severity = 'positive';
        title = '🎉 Dramatic Improvement';
        message = `Excellent news! Ticket volume dropped by ${Math.abs(change)} tickets (${magnitude.toFixed(0)}% decrease) in ${latest.period}. This is a substantial improvement.`;
        recommendation = 'Document what went well. Consider if recent initiatives (training, fixes, process improvements) contributed to this success.';
      } else if (magnitude > 20) {
        severity = 'positive';
        title = '✅ Significant Reduction';
        message = `${latest.period} shows strong improvement with ${Math.abs(change)} fewer tickets than ${previous.period} (${magnitude.toFixed(1)}% decrease).`;
        recommendation = 'Positive trend. Identify contributing factors to sustain this improvement.';
      } else {
        severity = 'positive';
        title = '👍 Modest Improvement';
        message = `Ticket volume decreased by ${Math.abs(change)} tickets (${magnitude.toFixed(1)}%) in ${latest.period}.`;
        recommendation = 'Heading in the right direction. Continue current practices.';
      }
    }

    insights.push({
      severity,
      title,
      message,
      recommendation,
      icon: severity === 'critical' ? 'alert' : severity === 'warning' ? 'warning' : severity === 'positive' ? 'success' : 'info'
    });
  } else {
    insights.push({
      severity: 'neutral',
      title: '➡️ Stable Volume',
      message: `${latest.period} maintained the same ticket volume as ${previous.period} (${latest.count} tickets). Consistency can indicate predictable demand.`,
      icon: 'info'
    });
  }

  // Pattern-based insights
  if (pattern.isVolatile && weeklyTrend.length >= 4) {
    insights.push({
      severity: 'warning',
      title: '🎢 High Volatility Detected',
      message: `Ticket volume is fluctuating significantly week-to-week. This unpredictability makes resource planning challenging.`,
      recommendation: 'Investigate root causes of volatility. Look for recurring patterns (e.g., weekly cycles, deployment schedules) or external factors.',
      icon: 'warning'
    });
  }

  if (pattern.momentum === 'accelerating' && pattern.isIncreasing) {
    insights.push({
      severity: 'critical',
      title: '🔥 Accelerating Growth',
      message: 'The rate of increase is accelerating - each week shows larger jumps than the previous. This suggests a growing problem.',
      recommendation: 'Urgent action needed. This pattern often indicates a systemic issue that\'s compounding. Escalate to leadership.',
      icon: 'alert'
    });
  }

  // Comparison to average
  const deviationFromAvg = ((latest.count - average) / average) * 100;
  if (Math.abs(deviationFromAvg) > 30) {
    insights.push({
      severity: deviationFromAvg > 0 ? 'warning' : 'positive',
      title: deviationFromAvg > 0 ? '📊 Well Above Average' : '📊 Well Below Average',
      message: `Current week is ${Math.abs(deviationFromAvg).toFixed(0)}% ${deviationFromAvg > 0 ? 'above' : 'below'} the ${weeklyTrend.length}-week average of ${average.toFixed(1)} tickets.`,
      recommendation: deviationFromAvg > 0 
        ? 'This is significantly higher than typical. Ensure adequate staffing and prioritize critical issues.'
        : 'Enjoying a quieter period. Good time for proactive work, training, or addressing technical debt.',
      icon: deviationFromAvg > 0 ? 'warning' : 'success'
    });
  }

  // Overall trend insight
  if (weeklyTrend.length >= 3) {
    const overallChange = latest.count - first.count;
    const overallPercent = first.count > 0 ? ((overallChange / first.count) * 100) : 0;
    
    if (Math.abs(overallPercent) > 25) {
      const direction = overallChange > 0 ? 'increased' : 'decreased';
      const sentiment = overallChange > 0 ? 'concerning' : 'encouraging';
      
      insights.push({
        severity: overallChange > 0 ? 'warning' : 'positive',
        title: `📉 ${weeklyTrend.length}-Week Trend: ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
        message: `Over the past ${weeklyTrend.length} weeks, ticket volume has ${direction} by ${Math.abs(overallPercent).toFixed(0)}% (from ${first.count} to ${latest.count}). This ${sentiment} trend deserves attention.`,
        recommendation: overallChange > 0
          ? 'Long-term upward trend suggests systemic issues. Consider root cause analysis, process improvements, or capacity planning.'
          : 'Sustained improvement is excellent. Document success factors and ensure they\'re maintained.',
        icon: overallChange > 0 ? 'warning' : 'success'
      });
    }
  }

  return insights.slice(0, 3); // Return top 3 most relevant insights
}

/**
 * Generates human-like insights for monthly trends
 */
export function generateMonthlyInsights(monthlyTrend: TrendData[]): TrendInsight[] {
  if (monthlyTrend.length < 2) {
    return [{
      severity: 'neutral',
      title: 'Insufficient Data',
      message: 'Need at least 2 months of data to generate meaningful insights.',
      icon: 'info'
    }];
  }

  const insights: TrendInsight[] = [];
  const latest = monthlyTrend[monthlyTrend.length - 1];
  const previous = monthlyTrend[monthlyTrend.length - 2];
  const change = latest.count - previous.count;
  const percentChange = previous.count > 0 ? ((change / previous.count) * 100) : 0;
  const average = monthlyTrend.reduce((sum, m) => sum + m.count, 0) / monthlyTrend.length;
  const pattern = analyzeTrendPattern(monthlyTrend);

  // Format month names - handle both "Jan 2025" and "2025-01" formats
  const formatMonth = (period: string) => {
    // If already formatted (e.g., "Jan 2025"), return as is
    if (period.includes(' ') && !period.includes('-')) {
      const [monthAbbr, year] = period.split(' ');
      const monthMap: Record<string, string> = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      };
      return `${monthMap[monthAbbr] || monthAbbr} ${year}`;
    }
    
    // Handle YYYY-MM format
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Month-over-month analysis
  if (Math.abs(change) > 0) {
    const magnitude = Math.abs(percentChange);
    let severity: TrendInsight['severity'] = 'neutral';
    let title = '';
    let message = '';
    let recommendation = '';

    if (change > 0) {
      if (magnitude > 40) {
        severity = 'critical';
        title = '🚨 Major Monthly Increase';
        message = `${formatMonth(latest.period)} experienced a significant surge with ${Math.abs(change)} more tickets than ${formatMonth(previous.period)} (${magnitude.toFixed(0)}% increase).`;
        recommendation = 'This level of increase over a full month indicates a serious trend. Conduct comprehensive analysis and consider strategic interventions.';
      } else if (magnitude > 15) {
        severity = 'warning';
        title = '📈 Monthly Volume Rising';
        message = `${formatMonth(latest.period)} saw ${Math.abs(change)} additional tickets compared to the previous month (${magnitude.toFixed(1)}% increase).`;
        recommendation = 'Monitor for seasonal patterns or emerging issues. Consider capacity planning if trend persists.';
      } else {
        severity = 'neutral';
        title = '➡️ Slight Monthly Increase';
        message = `${formatMonth(latest.period)} had ${Math.abs(change)} more tickets (${magnitude.toFixed(1)}% increase). This is within normal variation.`;
      }
    } else {
      if (magnitude > 40) {
        severity = 'positive';
        title = '🎊 Outstanding Monthly Performance';
        message = `${formatMonth(latest.period)} achieved remarkable results with ${Math.abs(change)} fewer tickets than ${formatMonth(previous.period)} (${magnitude.toFixed(0)}% reduction).`;
        recommendation = 'Exceptional performance! Analyze what drove this success and institutionalize those practices.';
      } else if (magnitude > 15) {
        severity = 'positive';
        title = '✨ Strong Monthly Improvement';
        message = `${formatMonth(latest.period)} shows solid improvement with ${Math.abs(change)} fewer tickets (${magnitude.toFixed(1)}% decrease).`;
        recommendation = 'Positive momentum. Identify and reinforce contributing factors.';
      } else {
        severity = 'positive';
        title = '👌 Modest Monthly Improvement';
        message = `${formatMonth(latest.period)} had ${Math.abs(change)} fewer tickets (${magnitude.toFixed(1)}% decrease).`;
      }
    }

    insights.push({
      severity,
      title,
      message,
      recommendation,
      icon: severity === 'critical' ? 'alert' : severity === 'warning' ? 'warning' : severity === 'positive' ? 'success' : 'info'
    });
  }

  // Seasonal or pattern insights
  if (monthlyTrend.length >= 6) {
    const peakMonth = monthlyTrend.reduce((max, m) => m.count > max.count ? m : max, monthlyTrend[0]);
    const lowMonth = monthlyTrend.reduce((min, m) => m.count < min.count ? m : min, monthlyTrend[0]);
    const range = peakMonth.count - lowMonth.count;
    const rangePercent = (range / average) * 100;

    if (rangePercent > 50) {
      insights.push({
        severity: 'warning',
        title: '🌊 High Seasonal Variation',
        message: `Ticket volume varies significantly across months. Peak was ${peakMonth.count} in ${formatMonth(peakMonth.period)}, low was ${lowMonth.count} in ${formatMonth(lowMonth.period)} (${rangePercent.toFixed(0)}% variation).`,
        recommendation: 'Consider flexible staffing models or identify seasonal drivers to better manage peak periods.',
        icon: 'warning'
      });
    }
  }

  // Trend direction
  if (pattern.isIncreasing && monthlyTrend.length >= 3) {
    insights.push({
      severity: 'warning',
      title: '📈 Sustained Upward Trend',
      message: `Ticket volume has been consistently increasing over multiple months. This pattern suggests growing demand or unresolved systemic issues.`,
      recommendation: 'Strategic review needed. Consider root cause analysis, process optimization, or capacity expansion.',
      icon: 'warning'
    });
  } else if (pattern.isDecreasing && monthlyTrend.length >= 3) {
    insights.push({
      severity: 'positive',
      title: '📉 Sustained Improvement',
      message: `Ticket volume has been consistently decreasing over multiple months. Your efforts are paying off!`,
      recommendation: 'Document and share success stories. Ensure improvements are sustainable.',
      icon: 'success'
    });
  }

  return insights.slice(0, 3);
}
