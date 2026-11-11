// frontend/src/Components/Rolesandpermissions/DeleteRoleModal.jsx
import { useState } from "react";
import { api } from "../../services/api";
import Icon from "../Icon";
import "../../styles/modals.css";

const DeleteRoleModal = ({ open, onClose, role, userCount, onRoleDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState([]);

  const handleDelete = async () => {
    if (!role) return;
    setLoading(true);
    setError("");

    try {
      await api.deleteRole(role._id);
      onRoleDeleted();
      onClose();
    } catch (err) {
      // Extract user list from error if available
      if (err.users) {
        setUsersList(err.users);
      }
      setError(err.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !role) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-body">
          <div className="delete-icon">
            <Icon name="warning" />
          </div>
          <h3 className="delete-title">Delete Role</h3>
          <p className="delete-text">
            Are you sure you want to delete <strong>{role.name}</strong>?
          </p>
          
          {userCount > 0 && (
            <div className="delete-warning">
              <Icon name="error" />
              <p>
                This role is assigned to <strong>{userCount}</strong> user
                {userCount !== 1 ? "s" : ""}. 
                You must reassign them before deleting this role.
              </p>
              {usersList.length > 0 && (
                <div className="assigned-users-list">
                  <p className="users-list-title">Assigned users:</p>
                  <ul>
                    {usersList.map(user => (
                      <li key={user._id || user.email}>
                        {user.name} ({user.email})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {error && <div className="error-alert">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading || userCount > 0}
            title={userCount > 0 ? "Cannot delete role with assigned users" : ""}
          >
            {loading ? "Deleting..." : "Delete Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRoleModal;