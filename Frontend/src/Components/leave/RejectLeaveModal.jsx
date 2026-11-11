// src/Components/leave/RejectLeaveModal.jsx
// Collects a required rejection reason before a Pending leave is rejected.
// Mirrors the Delete/Role modal pattern already used elsewhere in the app.
import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "../Icon.jsx";
import "../../styles/RejectLeaveModal.css";

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

const RejectLeaveModal = ({ 
  open, 
  leave, 
  onClose, 
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  // Reset local state each time the modal is opened for a (new) leave
  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
      setTouched(false);
      setLoading(false);
      
      // Auto-focus the textarea after a short delay
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [open, leave]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" && open && !loading) {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, loading, onClose]);

  // Validate reason
  const validateReason = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "A rejection reason is required.";
    }
    if (trimmed.length < MIN_REASON_LENGTH) {
      return `Reason must be at least ${MIN_REASON_LENGTH} characters.`;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      return `Reason must not exceed ${MAX_REASON_LENGTH} characters.`;
    }
    return null;
  }, []);

  // Handle reason change with validation
  const handleReasonChange = (e) => {
    const value = e.target.value;
    setReason(value);
    
    if (touched) {
      const validationError = validateReason(value);
      setError(validationError || "");
    }
  };

  // Handle blur for validation
  const handleBlur = () => {
    setTouched(true);
    const validationError = validateReason(reason);
    setError(validationError || "");
  };

  // Handle confirm
  const handleConfirm = async () => {
    const trimmed = reason.trim();
    
    // Validate
    const validationError = validateReason(trimmed);
    if (validationError) {
      setError(validationError);
      setTouched(true);
      textareaRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to reject leave request");
      textareaRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Handle keydown (Enter to submit)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
    }
  };

  if (!open || !leave) return null;

  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  const leaveTypeColors = {
    "Annual": "annual",
    "Sick": "sick",
    "Casual": "casual",
    "Maternity": "maternity",
    "Paternity": "paternity",
    "Unpaid": "unpaid",
    "Other": "other"
  };

  const leaveTypeLabel = leave.type || "Leave";
  const leaveTypeClass = leaveTypeColors[leave.type] || "other";

  // Inclusive day count between fromDate and toDate (both endpoints count as leave days)
  const leaveDurationDays = (() => {
    if (!leave.fromDate || !leave.toDate) return null;
    const from = new Date(leave.fromDate);
    const to = new Date(leave.toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.round((to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0)) / MS_PER_DAY) + 1;
  })();

  return (
    <div 
      className="modal-overlay" 
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      aria-describedby="reject-modal-description"
    >
      <div 
        className="modal modal-sm" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon danger">
              <Icon name="close" />
            </div>
            <h2 id="reject-modal-title">Reject Leave Request</h2>
          </div>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="error" />
              <span>{error}</span>
              <button 
                className="alert-close" 
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Leave Summary */}
          <div className="leave-summary" id="reject-modal-description">
            <p className="modal-message">
              You are about to reject <strong>{leave.userId?.name || "this employee"}</strong>'s 
              leave request.
            </p>
            
            <div className="leave-details-card">
              <div className="leave-detail-row">
                <span className="leave-detail-label">Type</span>
                <span className={`leave-type-badge ${leaveTypeClass}`}>
                  {leaveTypeLabel}
                </span>
              </div>
              
              {leave.fromDate && leave.toDate && (
                <div className="leave-detail-row">
                  <span className="leave-detail-label">Duration</span>
                  <span className="leave-detail-value">
                    {formatDate(leave.fromDate)} — {formatDate(leave.toDate)}
                  </span>
                </div>
              )}
              
              {leave.fromDate && leave.toDate && (
                <div className="leave-detail-row">
                  <span className="leave-detail-label">Days</span>
                  <span className="leave-detail-value">
                    {leaveDurationDays} day{leaveDurationDays !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              
              {leave.reason && (
                <div className="leave-detail-row">
                  <span className="leave-detail-label">Employee Reason</span>
                  <span className="leave-detail-value employee-reason">
                    "{leave.reason}"
                  </span>
                </div>
              )}
            </div>

            <p className="modal-message">
              Please provide a rejection reason. This will be visible to the employee.
            </p>
          </div>

          {/* Reason Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="rejectionReason">
              Rejection Reason <span className="required">*</span>
              <span className="character-count">
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </label>
            <textarea
              id="rejectionReason"
              ref={textareaRef}
              className={`form-input ${error && touched ? "input-error" : ""}`}
              rows={4}
              placeholder="e.g. Insufficient leave balance, conflicts with team schedule..."
              value={reason}
              onChange={handleReasonChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              aria-invalid={!!error && touched}
              aria-describedby={error ? "reason-error" : undefined}
              maxLength={MAX_REASON_LENGTH}
            />
            {error && touched && (
              <span className="input-error-message" id="reason-error" role="alert">
                <Icon name="error" size="small" />
                {error}
              </span>
            )}
            <span className="input-hint">
              Minimum {MIN_REASON_LENGTH} characters
            </span>
          </div>

          {/* Quick suggestion chips */}
          <div className="suggestion-chips">
            <span className="chip-label">Quick suggestions:</span>
            {[
              "Insufficient leave balance",
              "Conflicts with team schedule",
              "Project deadline conflict",
              "Incomplete documentation"
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="chip"
                onClick={() => {
                  setReason(suggestion);
                  setTouched(true);
                  const error = validateReason(suggestion);
                  setError(error || "");
                }}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirm}
            disabled={loading || !!error || !reason.trim()}
          >
            {(loading) ? (
              <>
                <span className="spinner-small" />
                Rejecting...
              </>
            ) : (
              "Reject Leave"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectLeaveModal;