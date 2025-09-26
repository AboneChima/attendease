import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Search, User, Mail, Phone, Calendar } from 'lucide-react';
import './StudentManagement.css';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (!token) {
        throw new Error('Please log in to access student management');
      }
      
      const response = await fetch('http://localhost:5000/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`Failed to fetch students: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Students data:', data);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      phone: student.phone || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const confirmEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/students/${selectedStudent.student_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update student');
      }
      
      await fetchStudents();
      setShowEditModal(false);
      setSelectedStudent(null);
      setEditForm({ name: '', email: '', phone: '' });
    } catch (err) {
      setError(err.message);
      console.error('Error updating student:', err);
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/students/${selectedStudent.student_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete student');
      }
      
      await fetchStudents();
      setShowDeleteModal(false);
      setSelectedStudent(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting student:', err);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="student-management">
      <div className="student-management-header">
        <h1>Student Management</h1>
        <p>Manage student records, edit information, and remove students</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      <div className="student-management-controls">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search students by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="refresh-btn" onClick={fetchStudents} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="students-grid">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <h3>No students found</h3>
            <p>{searchTerm ? 'Try adjusting your search terms' : 'No students registered yet'}</p>
          </div>
        ) : (
          filteredStudents.map(student => (
            <div key={student.student_id} className="student-card">
              <div className="student-card-header">
                <div className="student-avatar">
                  <User size={24} />
                </div>
                <div className="student-info">
                  <h3>{student.name}</h3>
                  <span className="student-id">{student.student_id}</span>
                </div>
              </div>
              
              <div className="student-details">
                <div className="detail-item">
                  <Mail size={16} />
                  <span>{student.email}</span>
                </div>
                {student.phone && (
                  <div className="detail-item">
                    <Phone size={16} />
                    <span>{student.phone}</span>
                  </div>
                )}
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>Registered: {formatDate(student.created_at)}</span>
                </div>
              </div>
              
              <div className="student-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(student)}
                  title="Edit student"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(student)}
                  title="Delete student"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Student</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Student name"
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="Student email"
                />
              </div>
              
              <div className="form-group">
                <label>Phone (Optional)</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="Student phone number"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={confirmEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h2>Delete Student</h2>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <Trash2 size={48} className="warning-icon" />
                <h3>Are you sure?</h3>
                <p>
                  You are about to permanently delete <strong>{selectedStudent?.name}</strong> 
                  (ID: {selectedStudent?.student_id}). This action cannot be undone.
                </p>
                <div className="warning-details">
                  <p><strong>This will also remove:</strong></p>
                  <ul>
                    <li>All attendance records</li>
                    <li>Face recognition data</li>
                    <li>Student profile information</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="delete-confirm-btn"
                onClick={confirmDelete}
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;