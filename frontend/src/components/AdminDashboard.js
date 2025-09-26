import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    student_id: '',
    date_from: '',
    date_to: '',
    modified_by: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters.page, fetchAuditLogs]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/attendance-management/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await response.json();
      setAuditLogs(data.data || []);
      setTotalPages(Math.ceil((data.pagination?.total || 0) / filters.limit));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearch = () => {
    fetchAuditLogs();
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (oldStatus, newStatus) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'present': return '#28a745';
        case 'absent': return '#dc3545';
        case 'late': return '#ffc107';
        default: return '#6c757d';
      }
    };

    return (
      <div className="status-change">
        <span 
          className="status-badge" 
          style={{ backgroundColor: getStatusColor(oldStatus) }}
        >
          {oldStatus || 'none'}
        </span>
        <span className="arrow">→</span>
        <span 
          className="status-badge" 
          style={{ backgroundColor: getStatusColor(newStatus) }}
        >
          {newStatus || 'none'}
        </span>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🔍 Attendance Audit Dashboard</h2>
        <p>Monitor and review all manual attendance modifications</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Student ID:</label>
            <input
              type="text"
              value={filters.student_id}
              onChange={(e) => handleFilterChange('student_id', e.target.value)}
              placeholder="Enter student ID"
            />
          </div>
          
          <div className="filter-group">
            <label>Modified By:</label>
            <input
              type="text"
              value={filters.modified_by}
              onChange={(e) => handleFilterChange('modified_by', e.target.value)}
              placeholder="Enter username"
            />
          </div>
          
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </div>
        
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? '🔄 Searching...' : '🔍 Search'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="audit-logs-section">
        {loading ? (
          <div className="loading">🔄 Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="no-data">📋 No audit logs found</div>
        ) : (
          <>
            <div className="logs-table">
              <div className="table-header">
                <div>Date/Time</div>
                <div>Student ID</div>
                <div>Status Change</div>
                <div>Modified By</div>
                <div>Reason</div>
                <div>IP Address</div>
              </div>
              
              {auditLogs.map((log, index) => (
                <div key={index} className="table-row">
                  <div className="log-datetime">
                    {formatDateTime(log.modified_at)}
                  </div>
                  <div className="log-student">
                    {log.student_id}
                  </div>
                  <div className="log-status">
                    {getStatusBadge(log.old_status, log.new_status)}
                  </div>
                  <div className="log-user">
                    {log.modified_by}
                  </div>
                  <div className="log-reason">
                    {log.reason || 'No reason provided'}
                  </div>
                  <div className="log-ip">
                    {log.ip_address || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  ← Previous
                </button>
                
                <span className="page-info">
                  Page {filters.page} of {totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;