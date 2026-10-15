import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Modal,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, Employee, SalaryCluster } from '@/services/api';

// Cross-platform alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
};

export default function DashboardScreen() {
  const router = useRouter();

  // Employee CRUD states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form inputs for Add Employee
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Phase 2: K-Means Salary Clustering states
  const [clusters, setClusters] = useState<SalaryCluster[] | null>(null);
  const [analyzingClusters, setAnalyzingClusters] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Leave'>('All');

  // Delete confirmation modal state (bulletproof on both web and native)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toggle status loading indicator
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit employee modal states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Leave'>('Active');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditPosition(emp.position);
    setEditSalary(String(emp.salary));
    setEditStatus(emp.status);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    setEditError(null);

    const nameTrim = editName.trim();
    const posTrim = editPosition.trim();
    const salTrim = editSalary.trim();

    if (!nameTrim || !posTrim || !salTrim) {
      const msg = 'All fields (Name, Position, and Salary) are required.';
      setEditError(msg);
      return;
    }

    const salaryNum = Number(salTrim);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      const msg = 'Salary must be a valid positive number.';
      setEditError(msg);
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await api.updateEmployee(
        editingEmployee.id,
        nameTrim,
        posTrim,
        salaryNum,
        editStatus
      );

      if (res && res.success) {
        setEmployees(prev =>
          prev.map(item => (item.id === editingEmployee.id ? res.employee : item))
        );
        setEditingEmployee(null);
        if (clusters) setClusters(null);
        showAlert('Success', `Employee ${res.employee.name} updated successfully!`);
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update employee.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Initial fetch with Auth Guard
  useEffect(() => {
    if (!api.isAuthenticated()) {
      showAlert('Unauthorized Access', 'Please sign in with administrator credentials.');
      router.replace('/');
      return;
    }
    fetchEmployees();
  }, []);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      showAlert('Error Fetching Employees', err.message || 'Unable to connect to backend.');
    } finally {
      setLoadingEmployees(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, []);

  // ==========================================
  // Phase 1: Client-Side Validation & Add Employee
  // ==========================================
  const handleAddEmployee = async () => {
    setFormError(null);
    setFormSuccess(null);

    const nameTrimmed = newName.trim();
    const positionTrimmed = newPosition.trim();
    const salaryTrimmed = newSalary.trim();

    // Client-side validation: Prevent submission if fields are empty
    if (!nameTrimmed || !positionTrimmed || !salaryTrimmed) {
      const msg = 'All fields (Name, Position, and Salary) are required.';
      setFormError(msg);
      showAlert('Validation Error', msg);
      return;
    }

    const salaryNumber = Number(salaryTrimmed);
    if (isNaN(salaryNumber) || salaryNumber <= 0) {
      const msg = 'Salary must be a valid positive number.';
      setFormError(msg);
      showAlert('Validation Error', msg);
      return;
    }

    setFormSubmitting(true);

    try {
      const result = await api.addEmployee(nameTrimmed, positionTrimmed, salaryNumber);
      if (result && result.success) {
        // UI updates automatically upon adding
        setEmployees(prev => [...prev, result.employee]);

        // Reset form inputs
        setNewName('');
        setNewPosition('');
        setNewSalary('');
        setFormSuccess(`Successfully added ${result.employee.name}!`);

        // If clusters were already calculated, clear them so user is prompted to re-analyze
        if (clusters) {
          setClusters(null);
        }

        setTimeout(() => setFormSuccess(null), 4000);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to add employee.';
      setFormError(msg);
      showAlert('Add Employee Failed', msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ==========================================
  // Phase 1: Toggle Employee Status (Active <-> On Leave)
  // ==========================================
  const handleToggleStatus = async (emp: Employee) => {
    try {
      setTogglingId(emp.id);
      const result = await api.toggleEmployeeStatus(emp.id);
      if (result && result.success) {
        // UI updates automatically upon editing
        setEmployees(prev =>
          prev.map(item => (item.id === emp.id ? result.employee : item))
        );
      }
    } catch (err: any) {
      showAlert('Update Failed', err.message || 'Could not update employee status.');
    } finally {
      setTogglingId(null);
    }
  };

  // ==========================================
  // Phase 1: Delete Confirmation & API Call
  // ==========================================
  const promptDeleteConfirmation = (emp: Employee) => {
    // Requirements: "You must display an Alert Confirmation dialog ('Are you sure?') before actually sending the delete request to the API."
    if (Platform.OS === 'web') {
      // Use web modal state for rich UI + window.confirm fallback
      setEmployeeToDelete(emp);
    } else {
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete ${emp.name}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(emp.id),
          },
        ]
      );
    }
  };

  const executeDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const result = await api.deleteEmployee(id);
      if (result && result.success) {
        // UI updates automatically upon deleting
        setEmployees(prev => prev.filter(item => item.id !== id));
        setEmployeeToDelete(null);

        // If clusters were displayed, clear them so they can be recomputed
        if (clusters) {
          setClusters(null);
        }
      }
    } catch (err: any) {
      showAlert('Delete Failed', err.message || 'Could not delete employee.');
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // Phase 2: K-Means Salary Clustering Analytics
  // ==========================================
  const handleAnalyzeSalaryStructure = async () => {
    setClusterError(null);
    setAnalyzingClusters(true);

    try {
      const result = await api.getSalaryClusters();
      if (result && result.success && Array.isArray(result.clusters)) {
        setClusters(result.clusters);
      } else {
        setClusterError('Received invalid cluster data from server.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to calculate salary clusters.';
      setClusterError(msg);
      showAlert('Clustering Failed', msg);
    } finally {
      setAnalyzingClusters(false);
    }
  };

  // Utility: Reset to Mock Data
  const handleResetMockData = async () => {
    try {
      setLoadingEmployees(true);
      await api.resetMockData();
      await fetchEmployees();
      setClusters(null);
      showAlert('Success', 'In-memory employees reset to initial 8 mock records.');
    } catch (err: any) {
      showAlert('Reset Failed', err.message || 'Could not reset database.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        api.logout();
        router.replace('/');
      }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            api.logout();
            router.replace('/');
          },
        },
      ]);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ? true : emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate quick stats
  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.status === 'Active').length;
  const onLeaveCount = employees.filter(e => e.status === 'On Leave').length;
  const averageSalary =
    totalEmployees > 0
      ? Math.round(
          employees.reduce((acc, cur) => acc + Number(cur.salary || 0), 0) /
            totalEmployees
        )
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Top Navbar */}
        <View style={styles.navbar}>
          <View style={styles.navBrand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🏢</Text>
            </View>
            <View>
              <Text style={styles.navTitle}>HR Manager Portal</Text>
              <Text style={styles.navSubtitle}>
                Salary Analytics & Staff Management
              </Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetMockData}
              accessibilityLabel="Reset Mock Data"
            >
              <Text style={styles.resetButtonText}>🔄 Reset Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              accessibilityLabel="Log Out"
            >
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats Summary Banner */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Staff</Text>
            <Text style={styles.statValue}>{totalEmployees}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {activeCount}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>On Leave</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {onLeaveCount}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg Salary</Text>
            <Text style={[styles.statValue, { color: '#60a5fa' }]}>
              ฿{averageSalary.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* PHASE 2: Automated Salary Clustering (K-Means Analytics) */}
        {/* ======================================================== */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Text style={{ fontSize: 18 }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionTitle}>
                  Phase 2: Salary Clustering Analytics
                </Text>
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>K-Means (k=3)</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Automatically groups company salaries into 3 distinct tiers
                based on 1D K-Means clustering.
              </Text>
            </View>
          </View>

          {/* Analyze Salary Structure Button */}
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              analyzingClusters && styles.analyzeButtonDisabled,
            ]}
            onPress={handleAnalyzeSalaryStructure}
            disabled={analyzingClusters}
          >
            {analyzingClusters ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.analyzeButtonText}>
                  Running K-Means Clustering...
                </Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>
                ⚡ Analyze Salary Structure
              </Text>
            )}
          </TouchableOpacity>

          {/* Cluster Error Message */}
          {clusterError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {clusterError}</Text>
            </View>
          ) : null}

          {/* Results Display: Summary Cards */}
          {clusters && clusters.length > 0 ? (
            <View style={styles.clustersContainer}>
              <Text style={styles.clustersResultTitle}>
                Clustering Results (3 Salary Tiers):
              </Text>
              <View style={styles.cardsGrid}>
                {clusters.map((cluster, index) => {
                  // Color accents for Tier 1, Tier 2, Tier 3
                  const colorScheme =
                    index === 0
                      ? {
                          border: '#38bdf8',
                          bg: 'rgba(56, 189, 248, 0.08)',
                          badgeBg: '#0369a1',
                          text: '#7dd3fc',
                          tierDesc: 'Entry / Junior Tier',
                        }
                      : index === 1
                      ? {
                          border: '#a855f7',
                          bg: 'rgba(168, 85, 247, 0.08)',
                          badgeBg: '#6b21a8',
                          text: '#c084fc',
                          tierDesc: 'Mid-Level / Professional Tier',
                        }
                      : {
                          border: '#10b981',
                          bg: 'rgba(16, 185, 129, 0.08)',
                          badgeBg: '#047857',
                          text: '#6ee7b7',
                          tierDesc: 'Senior / Executive Tier',
                        };

                  const pct =
                    totalEmployees > 0
                      ? Math.round((cluster.count / totalEmployees) * 100)
                      : 0;

                  return (
                    <View
                      key={cluster.group}
                      style={[
                        styles.clusterCard,
                        {
                          borderColor: colorScheme.border,
                          backgroundColor: colorScheme.bg,
                        },
                      ]}
                    >
                      <View style={styles.clusterCardHeader}>
                        <View
                          style={[
                            styles.tierBadge,
                            { backgroundColor: colorScheme.badgeBg },
                          ]}
                        >
                          <Text style={styles.tierBadgeText}>
                            {cluster.group}
                          </Text>
                        </View>
                        <Text style={styles.tierDesc}>
                          {colorScheme.tierDesc}
                        </Text>
                      </View>

                      {/* Centroid / Average Base Salary */}
                      <View style={styles.centroidSection}>
                        <Text style={styles.centroidLabel}>
                          Average Base Salary (Centroid):
                        </Text>
                        <Text
                          style={[
                            styles.centroidValue,
                            { color: colorScheme.text },
                          ]}
                        >
                          ฿{cluster.centroid.toLocaleString()}
                        </Text>
                      </View>

                      {/* Employee Count */}
                      <View style={styles.clusterFooterRow}>
                        <View style={styles.countPill}>
                          <Text style={styles.countLabel}>Employees:</Text>
                          <Text style={styles.countNumber}>
                            {cluster.count} staff ({pct}%)
                          </Text>
                        </View>
                      </View>

                      {/* Visual meter bar */}
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            {
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: colorScheme.border,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* ======================================================== */}
        {/* PHASE 1: Add Employee Form */}
        {/* ======================================================== */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Text style={{ fontSize: 18 }}>➕</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>Add New Employee</Text>
              <Text style={styles.sectionSubtitle}>
                Add employee records to the server in-memory database
              </Text>
            </View>
          </View>

          {/* Form Error or Success Feedback */}
          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {formError}</Text>
            </View>
          ) : null}

          {formSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {formSuccess}</Text>
            </View>
          ) : null}

          <View style={styles.formGrid}>
            {/* Name Input */}
            <View style={styles.inputField}>
              <Text style={styles.fieldLabel}>Employee Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Somchai Jaidee"
                placeholderTextColor="#64748b"
                value={newName}
                onChangeText={t => {
                  setNewName(t);
                  if (formError) setFormError(null);
                }}
              />
            </View>

            {/* Position Input */}
            <View style={styles.inputField}>
              <Text style={styles.fieldLabel}>Position *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Software Engineer"
                placeholderTextColor="#64748b"
                value={newPosition}
                onChangeText={t => {
                  setNewPosition(t);
                  if (formError) setFormError(null);
                }}
              />
            </View>

            {/* Salary Input */}
            <View style={styles.inputField}>
              <Text style={styles.fieldLabel}>Monthly Salary (THB) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 45000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={newSalary}
                onChangeText={t => {
                  setNewSalary(t);
                  if (formError) setFormError(null);
                }}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.addSubmitButton,
              formSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleAddEmployee}
            disabled={formSubmitting}
          >
            {formSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.addSubmitButtonText}>
                ➕ Submit New Employee
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* PHASE 1: Employee Directory List (CRUD UI) */}
        {/* ======================================================== */}
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Employee Directory</Text>
              <Text style={styles.sectionSubtitle}>
                Showing {filteredEmployees.length} of {employees.length} total
                employees
              </Text>
            </View>
          </View>

          {/* Filter & Search Bar */}
          <View style={styles.searchSectionContainer}>
            <View style={styles.searchLabelRow}>
              <Text style={styles.searchSectionLabel}>🔍 ค้นหาชื่อพนักงาน (Search Employee)</Text>
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchBtnText}>✕ ล้างคำค้นหา</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchLeadingIcon}>🔎</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="พิมพ์ชื่อพนักงาน หรือตำแหน่งที่ต้องการค้นหา..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearIcon}>
                  <Text style={styles.searchClearIconText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterChipsRow}>
              <Text style={styles.filterChipLabel}>ตัวกรองสถานะ:</Text>
              <View style={styles.filterChips}>
                {(['All', 'Active', 'On Leave'] as const).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chip,
                      statusFilter === status && styles.chipActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        statusFilter === status && styles.chipTextActive,
                      ]}
                    >
                      {status === 'All' ? 'ทั้งหมด (All)' : status === 'Active' ? '🟢 Active' : '🟡 On Leave'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {searchQuery ? (
              <View style={styles.searchResultBadge}>
                <Text style={styles.searchResultBadgeText}>
                  ผลการค้นหา "{searchQuery}": พบ {filteredEmployees.length} คน
                </Text>
              </View>
            ) : null}
          </View>

          {/* Loading Indicator */}
          {loadingEmployees && !refreshing ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading employee records...</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Employees Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || statusFilter !== 'All'
                  ? 'No records match your search criteria.'
                  : 'The directory is currently empty. Add an employee above.'}
              </Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {filteredEmployees.map(emp => {
                const isActive = emp.status === 'Active';
                const isToggling = togglingId === emp.id;
                const isDeleting = deletingId === emp.id;

                return (
                  <View key={emp.id} style={styles.employeeCard}>
                    <View style={styles.employeeTopRow}>
                      <View style={styles.employeeInfo}>
                        <View style={styles.nameBadgeRow}>
                          <Text style={styles.employeeName}>{emp.name}</Text>
                          {/* Status Badge */}
                          <View
                            style={[
                              styles.statusBadge,
                              isActive
                                ? styles.statusActive
                                : styles.statusOnLeave,
                            ]}
                          >
                            <View
                              style={[
                                styles.statusIndicatorDot,
                                {
                                  backgroundColor: isActive
                                    ? '#34d399'
                                    : '#fbbf24',
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color: isActive ? '#6ee7b7' : '#fde68a',
                                },
                              ]}
                            >
                              {emp.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.employeePosition}>
                          💼 {emp.position}
                        </Text>
                        <Text style={styles.employeeSalary}>
                          💰 ฿{Number(emp.salary).toLocaleString()}{' '}
                          <Text style={styles.salaryUnit}>/ month</Text>
                        </Text>
                      </View>

                      {/* Action Buttons: Edit, Toggle Status & Delete */}
                      <View style={styles.cardActions}>
                        {/* Edit Employee Button */}
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleOpenEdit(emp)}
                        >
                          <Text style={styles.editButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>

                        {/* Toggle Status Button */}
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            isActive
                              ? styles.toggleToLeave
                              : styles.toggleToActive,
                          ]}
                          onPress={() => handleToggleStatus(emp)}
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.toggleButtonText}>
                              {isActive ? '⏸️ Set On Leave' : '▶️ Set Active'}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => promptDeleteConfirmation(emp)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.deleteButtonText}>
                              🗑️ Delete
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Employee Modal */}
      <Modal
        visible={!!editingEmployee}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Employee Details</Text>
              <Text style={styles.modalSubtitle}>
                Update employee information in database
              </Text>
            </View>

            {editError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {editError}</Text>
              </View>
            ) : null}

            <View style={styles.modalInputGroup}>
              <Text style={styles.fieldLabel}>Employee Name *</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.fieldLabel}>Position *</Text>
              <TextInput
                style={styles.textInput}
                value={editPosition}
                onChangeText={setEditPosition}
                placeholder="Position / Title"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.fieldLabel}>Monthly Salary (THB) *</Text>
              <TextInput
                style={styles.textInput}
                value={editSalary}
                onChangeText={setEditSalary}
                keyboardType="numeric"
                placeholder="Salary"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.fieldLabel}>Employment Status</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    editStatus === 'Active' && styles.statusOptionActive,
                  ]}
                  onPress={() => setEditStatus('Active')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      editStatus === 'Active' && styles.statusOptionTextSelected,
                    ]}
                  >
                    🟢 Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    editStatus === 'On Leave' && styles.statusOptionOnLeave,
                  ]}
                  onPress={() => setEditStatus('On Leave')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      editStatus === 'On Leave' && styles.statusOptionTextSelected,
                    ]}
                  >
                    🟡 On Leave
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingEmployee(null)}
                disabled={editSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>💾 Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal (Cross-platform and Web-safe) */}
      <Modal
        visible={!!employeeToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setEmployeeToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalWarningIcon}>
              <Text style={{ fontSize: 28 }}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete Employee Confirmation</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove{' '}
              <Text style={{ fontWeight: '700', color: '#f8fafc' }}>
                {employeeToDelete?.name}
              </Text>{' '}
              ({employeeToDelete?.position}) from the system?
            </Text>
            <Text style={styles.modalSubMessage}>
              This will permanently delete this record from server memory.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEmployeeToDelete(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmDeleteBtn}
                onPress={() => {
                  if (employeeToDelete) {
                    executeDelete(employeeToDelete.id);
                  }
                }}
              >
                <Text style={styles.modalConfirmDeleteBtnText}>
                  Yes, Delete Employee
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 22,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 4,
  },
  analyticsSection: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 18,
  },
  aiTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  aiTagText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '700',
  },
  analyzeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clustersContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  clustersResultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  cardsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  clusterCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  clusterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tierBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  tierDesc: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  centroidSection: {
    marginBottom: 10,
  },
  centroidLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  centroidValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  clusterFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countLabel: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  countNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  formSection: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  formGrid: {
    gap: 12,
    marginBottom: 16,
  },
  inputField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  textInput: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
  },
  addSubmitButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  addSubmitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '600',
  },
  listSection: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  listHeaderRow: {
    marginBottom: 14,
  },
  searchSectionContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
    gap: 12,
  },
  searchLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#93c5fd',
    letterSpacing: 0.3,
  },
  clearSearchBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearSearchBtnText: {
    fontSize: 11,
    color: '#f87171',
    fontWeight: '600',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingHorizontal: 12,
    height: 46,
  },
  searchLeadingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 14,
    outlineWidth: 0,
  },
  searchClearIcon: {
    padding: 6,
  },
  searchClearIconText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterChipLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  searchResultBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  searchResultBadgeText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '600',
  },
  filterBar: {
    gap: 10,
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1f2937',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  cardsList: {
    gap: 12,
  },
  employeeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  employeeTopRow: {
    flexDirection: 'column',
    gap: 14,
  },
  employeeInfo: {
    gap: 6,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusOnLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  employeePosition: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  employeeSalary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60a5fa',
  },
  salaryUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94a3b8',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  toggleButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  toggleToLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  toggleToActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f87171',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modalWarningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalSubMessage: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmDeleteBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60a5fa',
  },
  editModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  modalInputGroup: {
    width: '100%',
    marginBottom: 14,
    gap: 6,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  statusOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusOptionOnLeave: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
