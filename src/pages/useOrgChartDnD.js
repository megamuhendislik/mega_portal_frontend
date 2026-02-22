import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Custom hook that encapsulates all drag-and-drop state and logic
 * for the org chart employee reassignment feature.
 * Uses native HTML5 Drag & Drop API (no library needed).
 *
 * @param {Object} options
 * @param {boolean} options.isEditMode - Whether edit mode is active (drag is only allowed when true)
 * @param {Function} options.onReassignComplete - Callback fired after a successful reassignment
 * @returns {Object} Drag-and-drop state and handler functions
 */
export function useOrgChartDnD({ isEditMode, onReassignComplete }) {
  const [draggedEmployee, setDraggedEmployee] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [pendingReassignment, setPendingReassignment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Called when drag starts on an employee card.
   * Only works if isEditMode is true.
   *
   * @param {DragEvent} e - The native drag event
   * @param {Object} employeeData - Employee being dragged
   *   { id, name, title, department_id, job_position_id, manager_id }
   */
  const handleDragStart = useCallback((e, employeeData) => {
    if (!isEditMode) return;

    setDraggedEmployee(employeeData);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(employeeData));
  }, [isEditMode]);

  /**
   * Called when drag ends. Clears all drag-related state.
   */
  const handleDragEnd = useCallback(() => {
    setDraggedEmployee(null);
    setDropTargetId(null);
  }, []);

  /**
   * Called when dragging over a potential drop target.
   * Validates the target and sets the drop target highlight state.
   *
   * @param {DragEvent} e - The native drag event
   * @param {Object} targetData - The drop target data { id, ... }
   */
  const handleDragOver = useCallback((e, targetData) => {
    if (!draggedEmployee) return;
    if (targetData.id === draggedEmployee.id) return;

    e.preventDefault();
    setDropTargetId(targetData.id);
  }, [draggedEmployee]);

  /**
   * Called when the drag leaves a drop target. Clears the highlight.
   */
  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  /**
   * Called on drop. Validates and sets pending reassignment for user confirmation.
   *
   * @param {DragEvent} e - The native drag event
   * @param {Object} targetData - The drop target data
   *   { id, name, department_id, job_position_id, type: 'employee' | 'department' }
   */
  const handleDrop = useCallback((e, targetData) => {
    e.preventDefault();

    if (!draggedEmployee) return;
    if (targetData.id === draggedEmployee.id) return;

    setPendingReassignment({
      employee: draggedEmployee,
      target: targetData,
    });

    setDraggedEmployee(null);
    setDropTargetId(null);
  }, [draggedEmployee]);

  /**
   * Called when the user confirms the reassignment in the modal.
   * Sends a PATCH request to update the employee's manager or department.
   */
  const confirmReassignment = useCallback(async () => {
    if (!pendingReassignment) return;

    const { employee, target } = pendingReassignment;
    setIsSaving(true);

    try {
      let patchData;

      if (target.type === 'employee') {
        patchData = {
          primary_managers: [{
            manager_id: target.id,
            department_id: target.department_id,
            job_position_id: target.job_position_id,
          }],
        };
      } else if (target.type === 'department') {
        patchData = {
          department: target.id,
          primary_managers: [],
        };
      }

      await api.patch(`/employees/${employee.id}/`, patchData);

      toast.success(
        `${employee.name} basariyla yeniden atandi.`
      );
      setPendingReassignment(null);

      if (onReassignComplete) {
        onReassignComplete();
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        'Atama sirasinda bir hata olustu.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [pendingReassignment, onReassignComplete]);

  /**
   * Called when the user cancels the reassignment modal.
   * Clears the pending reassignment state.
   */
  const cancelReassignment = useCallback(() => {
    setPendingReassignment(null);
  }, []);

  return {
    // State
    draggedEmployee,
    dropTargetId,
    pendingReassignment,
    isSaving,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    confirmReassignment,
    cancelReassignment,
  };
}
