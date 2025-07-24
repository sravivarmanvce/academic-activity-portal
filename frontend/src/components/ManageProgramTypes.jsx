// src/components/ManageProgramTypes.jsx

import React, { useEffect, useState } from "react";
import API from "../Api";
import { Modal, Button, Form, Table } from "react-bootstrap";
import { FaEdit, FaTrash } from "react-icons/fa";

const ManageProgramTypes = () => {
  const [programTypes, setProgramTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [formData, setFormData] = useState({
    program_type: "",
    sub_program_type: "",
    activity_category: "",
    departments: "",
    budget_mode: "Fixed",
    budget_per_event: "0",
  });

  useEffect(() => {
    API.get("/departments")
      .then((res) => setDepartments(res.data))
      .catch((err) => console.error("Failed to load departments", err));
  }, []);

  const fetchProgramTypes = async () => {
    try {
      const res = await API.get("/program-types");
      setProgramTypes(res.data);
    } catch (error) {
      console.error("Failed to fetch program types:", error);
    }
  };

  const fetchActivityCategories = async () => {
    try {
      const res = await API.get("/activity-categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    fetchProgramTypes();
    fetchActivityCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "budget_mode") {
      setFormData((prev) => ({
        ...prev,
        budget_mode: value,
        budget_per_event: value === "Variable" ? "0" : prev.budget_per_event || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddClick = () => {
    setEditing(null);
    setFormData({
      program_type: "",
      sub_program_type: "",
      activity_category: "",
      departments: "",
      budget_mode: "Fixed",
      budget_per_event: "0",
    });
    setShowModal(true);
  };

  const handleEditClick = (pt) => {
    setEditing(pt.id);
    setFormData({
      program_type: pt.program_type,
      sub_program_type: pt.sub_program_type || "",
      activity_category: pt.activity_category || "",
      departments: pt.departments || "",
      budget_mode: pt.budget_mode,
      budget_per_event: pt.budget_per_event?.toString() || "0",
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Are you sure you want to delete this program type?")) {
      try {
        await API.delete(`/program-types/${id}`);
        fetchProgramTypes();
      } catch (error) {
        alert("Failed to delete.");
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        budget_per_event: formData.budget_mode === "Variable" ? 0 : parseFloat(formData.budget_per_event || "0"),
      };

      if (editing) {
        await API.put(`/program-types/${editing}`, payload);
      } else {
        await API.post("/program-types", payload);
      }

      fetchProgramTypes();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save program type:", error);
      alert("Error saving data. Please check input.");
    }
  };

  return (
    <div className="container mt-4">
      <h3>Program Type Management</h3>
      <Button className="mb-3" onClick={handleAddClick}>
        + Add Program Type
      </Button>

      <Table bordered hover>
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Program Type</th>
            <th>Sub Type</th>
            <th>Activity Category</th>
            <th>Departments</th>
            <th>Budget Mode</th>
            <th>Budget/Event</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {programTypes.map((pt, index) => (
            <tr key={pt.id}>
              <td>{index + 1}</td>
              <td>{pt.program_type}</td>
              <td>{pt.sub_program_type}</td>
              <td>{pt.activity_category}</td>
              <td>{pt.departments}</td>
              <td>{pt.budget_mode}</td>
              <td>{pt.budget_per_event}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => handleEditClick(pt)}><FaEdit /></Button>{" "}
                <Button variant="danger" size="sm" onClick={() => handleDeleteClick(pt.id)}><FaTrash /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Edit Program Type" : "Add Program Type"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Program Type</Form.Label>
              <Form.Control
                type="text"
                name="program_type"
                value={formData.program_type}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Sub Program Type</Form.Label>
              <Form.Control
                type="text"
                name="sub_program_type"
                value={formData.sub_program_type}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Activity Category</Form.Label>
              <Form.Select
                name="activity_category"
                value={formData.activity_category}
                onChange={handleInputChange}
              >
                <option value="">-- Select --</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Departments</Form.Label>
              <Form.Select
                multiple
                name="departments"
                value={formData.departments.split(",")}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                  setFormData((prev) => ({ ...prev, departments: selected.join(",") }));
                }}
              >
                <option value="ALL">ALL</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text muted>Use Ctrl/Command to select multiple departments</Form.Text>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Budget Mode</Form.Label>
              <Form.Select
                name="budget_mode"
                value={formData.budget_mode}
                onChange={handleInputChange}
              >
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Budget per Event</Form.Label>
              <Form.Control
                type="number"
                name="budget_per_event"
                value={formData.budget_per_event}
                onChange={handleInputChange}
                disabled={formData.budget_mode === "Variable"}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Save</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManageProgramTypes;
