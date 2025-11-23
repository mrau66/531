/**
 * SessionVisualManager - Visual Feedback and UI State
 *
 * PURPOSE:
 * Manages all visual aspects of session tracking including:
 * - Completion styling (green background, strikethrough)
 * - Loading states (grey-out during data loads)
 * - Immediate visual feedback for user interactions
 *
 * RESPONSIBILITIES:
 * - Apply/remove completion styles to DOM elements
 * - Grey out workout areas during loading
 * - Restore normal visual state after loading
 * - Toggle visual states for immediate feedback
 * - Apply states from store to UI (batch operations)
 *
 * DEPENDENCIES:
 * - DOM elements with specific classes (.set-row, .accessory-item, etc.)
 */

export class SessionVisualManager {
  constructor() {
    // No state needed - pure visual operations
  }

  // ===========================================
  // LOADING VISUAL FEEDBACK
  // ===========================================

  greyOut() {
    const workoutAreas = document.querySelectorAll(
      ".lift-workout, .workout-display, [data-tab]"
    );

    workoutAreas.forEach((area) => {
      area.style.opacity = "0.2";
      area.style.pointerEvents = "none";
      area.style.transition = "opacity 0.5s ease";
    });
  }

  unGreyOut() {
    const workoutAreas = document.querySelectorAll(
      ".lift-workout, .workout-display, [data-tab]"
    );

    workoutAreas.forEach((area) => {
      area.style.opacity = "";
      area.style.pointerEvents = "";
    });
  }

  // ===========================================
  // COMPLETION STYLING
  // ===========================================

  applyStyles(element, isCompleted) {
    if (isCompleted) {
      element.style.cssText = `
        background: #d4edda !important;
        border-left: 4px solid #006400 !important;
        opacity: 0.9 !important;
        transform: translateX(4px) !important;
        transition: all 0.2s ease !important;
      `;

      // Strike through text
      element.querySelectorAll(".set-info, .weight, span").forEach((el) => {
        el.style.textDecoration = "line-through";
        el.style.color = "#006400";
      });

      if (element.classList.contains("accessory-item")) {
        element.style.textDecoration = "line-through";
        element.style.color = "#006400";
      }
    } else {
      element.style.cssText = "";
      element.querySelectorAll("*").forEach((el) => {
        el.style.textDecoration = "";
        el.style.color = "";
      });
    }
  }

  toggleVisualState(element) {
    // Toggle visual state immediately for feedback
    const isCompleted = element.classList.contains("completed");
    element.classList.toggle("completed");
    this.applyStyles(element, !isCompleted);

    // Haptic feedback
    if ("vibrate" in navigator) navigator.vibrate(30);
  }

  // ===========================================
  // BATCH UI UPDATES
  // ===========================================

  applyStateToUI(liftType, completionState, container) {
    if (!completionState || !container) return;

    // Clear existing states
    container.querySelectorAll(".completed").forEach((el) => {
      el.classList.remove("completed");
      this.applyStyles(el, false);
    });

    // Apply states to visible elements
    const applyToElements = (selector, stateArray) => {
      const elements = Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.style.display !== "none"
      );
      stateArray.forEach((isCompleted, index) => {
        if (elements[index] && isCompleted) {
          elements[index].classList.add("completed");
          this.applyStyles(elements[index], true);
        }
      });
    };

    applyToElements(`#${liftType}-main-sets .set-row`, completionState.mainSets);
    applyToElements(
      `#${liftType}-supplemental-sets .set-row`,
      completionState.supplementalSets
    );
    applyToElements(
      `#${liftType}-accessories .accessory-item`,
      completionState.accessories
    );
  }

  applyAllStatesToUI(lifts, getCompletionFn, getContainerFn) {
    lifts.forEach((lift) => {
      const state = getCompletionFn(lift);
      const container = getContainerFn(lift);
      this.applyStateToUI(lift, state, container);
    });
  }
}
