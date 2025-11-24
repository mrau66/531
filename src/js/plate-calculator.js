/**
 * Plate Calculator
 *
 * Calculates the plate loading required to achieve a target weight.
 * Useful for knowing exactly which plates to load on the barbell.
 */

// Standard plate denominations in kg (sorted largest to smallest)
const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25];

// Standard barbell weights
export const BAR_WEIGHTS = {
  OLYMPIC_MENS: 20,      // Standard Olympic bar (men's)
  OLYMPIC_WOMENS: 15,    // Women's Olympic bar
  STANDARD: 20,          // Most common
};

/**
 * Calculate plates needed per side to achieve target weight
 *
 * @param {number} targetWeight - Total weight including bar (kg)
 * @param {number} barWeight - Weight of the barbell (default 20kg)
 * @param {number[]} availablePlates - Available plate denominations (default standard plates)
 * @returns {Object} Plate calculation result
 */
export function calculatePlates(targetWeight, barWeight = BAR_WEIGHTS.STANDARD, availablePlates = STANDARD_PLATES) {
  // Validation
  if (targetWeight < barWeight) {
    return {
      plates: [],
      totalWeight: barWeight,
      perSide: 0,
      isExact: true,
      message: 'Bar only'
    };
  }

  // Calculate weight needed on plates (excluding bar)
  const weightOnPlates = targetWeight - barWeight;

  // Weight per side
  const weightPerSide = weightOnPlates / 2;

  // Calculate plates needed per side using greedy algorithm
  let remainingWeight = weightPerSide;
  const plates = [];

  for (const plate of availablePlates) {
    while (remainingWeight >= plate - 0.001) { // Small tolerance for floating point
      plates.push(plate);
      remainingWeight -= plate;
    }
  }

  // Calculate actual achieved weight
  const actualWeightPerSide = plates.reduce((sum, plate) => sum + plate, 0);
  const actualTotalWeight = barWeight + (actualWeightPerSide * 2);
  const isExact = Math.abs(actualTotalWeight - targetWeight) < 0.01;

  return {
    plates,                    // Array of plates per side (e.g., [25, 10, 2.5])
    totalWeight: actualTotalWeight,
    perSide: actualWeightPerSide,
    targetWeight,
    barWeight,
    isExact,
    difference: targetWeight - actualTotalWeight,
    message: formatPlateMessage(plates)
  };
}

/**
 * Format plates array into readable message
 * Groups duplicate plates and formats nicely
 *
 * @param {number[]} plates - Array of plate weights
 * @returns {string} Formatted message (e.g., "2×25kg, 1×10kg, 1×2.5kg")
 */
function formatPlateMessage(plates) {
  if (plates.length === 0) {
    return 'No plates needed';
  }

  // Count occurrences of each plate
  const plateCounts = {};
  plates.forEach(plate => {
    plateCounts[plate] = (plateCounts[plate] || 0) + 1;
  });

  // Format as "2×25kg, 1×10kg"
  const formatted = Object.entries(plateCounts)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])) // Sort by plate size descending
    .map(([plate, count]) => `${count}×${plate}kg`)
    .join(', ');

  return formatted;
}

/**
 * Get visual representation of plates for UI
 * Returns array of plate objects with sizes for visual rendering
 *
 * @param {number} targetWeight - Total weight including bar
 * @param {number} barWeight - Weight of the barbell
 * @returns {Object} Visual plate data
 */
export function getPlateVisualization(targetWeight, barWeight = BAR_WEIGHTS.STANDARD) {
  const result = calculatePlates(targetWeight, barWeight);

  // Map plates to visual sizes (relative widths)
  const plateVisuals = result.plates.map(weight => ({
    weight,
    size: getPlateSizeClass(weight),
    color: getPlateColor(weight)
  }));

  return {
    ...result,
    visuals: plateVisuals
  };
}

/**
 * Get CSS class for plate size
 */
function getPlateSizeClass(weight) {
  if (weight >= 20) return 'large';
  if (weight >= 10) return 'medium';
  if (weight >= 2.5) return 'small';
  return 'tiny';
}

/**
 * Get color for plate based on standard color coding
 * (Follows competition plate colors roughly)
 */
function getPlateColor(weight) {
  const colors = {
    25: '#e74c3c',    // Red
    20: '#3498db',    // Blue
    15: '#f39c12',    // Yellow/Orange
    10: '#2ecc71',    // Green
    5: '#ecf0f1',     // White/Light gray
    2.5: '#e74c3c',   // Red
    1.25: '#95a5a6',  // Gray
    0.5: '#95a5a6',   // Gray
    0.25: '#95a5a6'   // Gray
  };
  return colors[weight] || '#95a5a6';
}

/**
 * Validate if target weight is achievable with available plates
 *
 * @param {number} targetWeight - Desired total weight
 * @param {number} barWeight - Bar weight
 * @param {number[]} availablePlates - Available plates
 * @returns {boolean} True if weight is achievable
 */
export function isWeightAchievable(targetWeight, barWeight = BAR_WEIGHTS.STANDARD, availablePlates = STANDARD_PLATES) {
  const result = calculatePlates(targetWeight, barWeight, availablePlates);
  return result.isExact;
}

/**
 * Get smallest increment possible with available plates
 */
export function getSmallestIncrement(availablePlates = STANDARD_PLATES) {
  const smallest = Math.min(...availablePlates);
  return smallest * 2; // Both sides
}

export default {
  calculatePlates,
  getPlateVisualization,
  isWeightAchievable,
  getSmallestIncrement,
  BAR_WEIGHTS
};
