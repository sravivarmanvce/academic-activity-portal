import React, { useEffect, useState } from "react";
import API from "../Api";
import { FaTrash, FaEdit } from "react-icons/fa";
import { MdPersonAddAlt1 } from "react-icons/md";

const defaultUser = {
  name: "",
  email: "",
  role: "",
  department_id: null,
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(defaultUser);
  const [editingId, setEditingId] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      alert("Failed to fetch users.");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      alert("Failed to fetch departments.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "role") {
      const noDeptRoles = ["dean", "principal", "admin"];
      setFormData((prev) => ({
        ...prev,
        role: value,
        department_id: noDeptRoles.includes(value) ? null : prev.department_id,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "department_id" ? (value === "" ? null : parseInt(value)) : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        department_id:
          formData.department_id === "" || formData.department_id === undefined
            ? null
            : parseInt(formData.department_id),
      };

      if (editingId) {
        await API.put(`/users/${editingId}`, payload);
      } else {
        await API.post("/users", payload);
      }

      setFormData(defaultUser);
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Something went wrong");
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || "",
    });
    setEditingId(user.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await API.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  return (
    <div className="container py-4">
      <h2 className="fs-4 fw-bold mb-4 d-flex align-items-center gap-2 text-primary">
        <MdPersonAddAlt1 size={24} />
        Manage Users
      </h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="row g-3 bg-light p-4 rounded-4 shadow-sm border"
      >
        <div className="col-md-3">
          <input
            type="text"
            name="name"
            value={formData.name}
            placeholder="Name"
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>
        <div className="col-md-3">
          <input
            type="email"
            name="email"
            value={formData.email}
            placeholder="Email"
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>
        <div className="col-md-2">
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="form-select"
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="principal">Principal</option>
            <option value="hod">HoD</option>
            <option value="faculty">Faculty</option>
            <option value="dean">Dean</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            name="department_id"
            value={formData.department_id ?? ""}
            onChange={handleChange}
            className="form-select"
            disabled={["dean", "principal", "admin"].includes(formData.role)}
          >
            <option value="">No Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2 d-flex gap-2 align-items-start">
          <button
            type="submit"
            className="btn btn-primary fw-semibold"
          >
            {editingId ? "Update" : "Add User"}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setFormData(defaultUser);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          )}
        </div>

      </form>

      {/* Table */}
      <div className="table-responsive mt-5">
        <table className="table table-bordered table-hover align-middle shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-secondary">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td className="text-capitalize">{u.role}</td>
                  <td>{departments.find((d) => d.id === u.department_id)?.name || "--"}</td>
                  <td className="text-center">
                    <button
                      onClick={() => handleEdit(u)}
                      className="btn btn-sm btn-outline-primary me-2"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="btn btn-sm btn-outline-danger"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;
