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
  const [contextMenuTarget, setContextMenuTarget] = useState(null);

  /**
   * Called when drag starts on an employee card.
   * Only works if isEditMode is true.
   *
   * @param {DragEvent} e - The native drag event
   * @param {Object} employeeData - Employee being dragged
   *   { id, name, title, department_id, job_position_id, manager_id }
   */
  const handleDragStart = useCallback((e, employeeData) => {
    if (!isEditMode || isSaving) return;

    setDraggedEmployee(employeeData);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(employeeData));
  }, [isEditMode, isSaving]);

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

    if (!draggedEmployee || isSaving) return;
    if (targetData.id === draggedEmployee.id) return;

    setPendingReassignment({
      employee: draggedEmployee,
      target: targetData,
    });

    setDraggedEmployee(null);
    setDropTargetId(null);
  }, [draggedEmployee, isSaving]);

  /**
   * Called when the user confirms the reassignment in the modal.
   * Sends a PATCH request to update the employee's manager or department.
   *
   * @param {'PRIMARY' | 'SECONDARY'} managerType - Which manager list to add to
   */
  const confirmReassignment = useCallback(async (managerType = 'PRIMARY') => {
    if (!pendingReassignment) return;
    const { employee, target } = pendingReassignment;

    // Defense-in-depth: prevent self-assignment
    if (target.type === 'employee' && target.id === employee.id) {
      setPendingReassignment(null);
      return;
    }

    setIsSaving(true);

    try {
      if (target.type === 'employee') {
        // Fetch current managers right before PATCH to minimize race window
        const empRes = await api.get(`/employees/${employee.id}/`);
        const currentPrimary = (empRes.data.primary_managers || []).map(m => ({
          manager_id: m.id, department_id: m.department_id, job_position_id: m.job_position_id,
        }));
        const currentSecondary = (empRes.data.secondary_managers || []).map(m => ({
          manager_id: m.id, department_id: m.department_id, job_position_id: m.job_position_id,
        }));

        const newEntry = {
          manager_id: target.id,
          department_id: target.department_id || null,
          job_position_id: target.job_position_id || null,
        };

        let patchData;
        if (managerType === 'PRIMARY') {
          if (currentPrimary.some(m => m.manager_id === target.id)) {
            toast.error('Bu kişi zaten birincil yönetici olarak atanmış.');
            setPendingReassignment(null);
            setIsSaving(false);
            return;
          }
          patchData = { primary_managers: [...currentPrimary, newEntry] };
        } else {
          if (currentSecondary.some(m => m.manager_id === target.id)) {
            toast.error('Bu kişi zaten ikincil yönetici olarak atanmış.');
            setPendingReassignment(null);
            setIsSaving(false);
            return;
          }
          patchData = { secondary_managers: [...currentSecondary, newEntry] };
        }

        await api.patch(`/employees/${employee.id}/`, patchData);
      } else if (target.type === 'department') {
        await api.patch(`/employees/${employee.id}/`, {
          department: target.id,
        });
      }

      toast.success(`${employee.name} başarıyla yeniden atandı.`);
      setPendingReassignment(null);
      if (onReassignComplete) onReassignComplete();
    } catch (error) {
      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || (typeof error.response?.data === 'string' ? error.response.data : null)
        || 'Atama sırasında bir hata oluştu.';
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

  const handleContextMenu = useCallback((e, employeeData) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTarget({
      employee: employeeData,
      position: { x: e.clientX, y: e.clientY },
    });
  }, [isEditMode]);

  const closeContextMenu = useCallback(() => {
    setContextMenuTarget(null);
  }, []);

  return {
    // State
    draggedEmployee,
    dropTargetId,
    pendingReassignment,
    isSaving,
    contextMenuTarget,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    confirmReassignment,
    cancelReassignment,
    handleContextMenu,
    closeContextMenu,
  };
}
