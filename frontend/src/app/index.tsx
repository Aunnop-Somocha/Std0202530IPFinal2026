import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';

// Cross-platform alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
};

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API Config modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(api.getBaseUrl());
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  // Check backend server connectivity on mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    const online = await api.checkHealth();
    setIsServerOnline(online);
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    // Client-side validation
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      const msg = 'Please enter both username and password.';
      setErrorMessage(msg);
      showAlert('Validation Error', msg);
      return;
    }

    setLoading(true);

    try {
      const result = await api.login(trimmedUser, trimmedPass);

      if (result && result.success) {
        // Successful login -> navigate to Dashboard
        router.replace('/dashboard');
      } else {
        const errorText = 'Invalid credentials. Please try again.';
        setErrorMessage(errorText);
        showAlert('Login Failed', errorText);
      }
    } catch (err: any) {
      const errorText = err.message || 'Invalid username or password';
      setErrorMessage(errorText);
      showAlert('Login Failed', errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    api.setBaseUrl(customApiUrl);
    setShowConfigModal(false);
    checkServerHealth();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header & Branding */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🏢</Text>
          </View>
          <Text style={styles.appTitle}>HR Manager</Text>
          <Text style={styles.appSubtitle}>& Salary Analytics System</Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isServerOnline ? '#10b981' : '#f59e0b' },
              ]}
            />
            <Text style={styles.badgeText}>
              Backend: {isServerOnline ? 'Connected' : 'Checking...'} (
              {api.getBaseUrl()})
            </Text>
            <TouchableOpacity
              onPress={() => setShowConfigModal(true)}
              style={styles.configLink}
            >
              <Text style={styles.configLinkText}>⚙️ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Enter administrator credentials to manage staff records
          </Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefixIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username (admin)"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {username ? (
                <TouchableOpacity
                  onPress={() => setUsername('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefixIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password (password123)"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Demo Fill Button */}
          <TouchableOpacity
            style={styles.quickFillButton}
            onPress={handleQuickFill}
          >
            <Text style={styles.quickFillText}>
              ⚡ Quick Fill Admin: admin / password123
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Log In to Dashboard →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Student ID: 6730202530 | Internet Programming Final Exam
          </Text>
          <Text style={styles.footerSubtext}>
            Express.js In-Memory Backend & React Native Frontend
          </Text>
        </View>
      </ScrollView>

      {/* Backend URL Config Modal */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Backend API URL</Text>
            <Text style={styles.modalDescription}>
              If running on a physical phone or non-standard port, update the IP address below:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://localhost:5000"
              placeholderTextColor="#64748b"
            />

            <View style={styles.modalQuickUrls}>
              <TouchableOpacity
                style={styles.modalChip}
                onPress={() => setCustomApiUrl('http://localhost:5000')}
              >
                <Text style={styles.modalChipText}>localhost:5000</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalChip}
                onPress={() => setCustomApiUrl('http://10.0.2.2:5000')}
              >
                <Text style={styles.modalChipText}>10.0.2.2:5000 (Android)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveApiUrl}
              >
                <Text style={styles.modalSaveText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 34,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  configLink: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  configLinkText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    height: 48,
  },
  inputPrefixIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  clearIcon: {
    color: '#9ca3af',
    fontSize: 16,
    padding: 4,
  },
  quickFillButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  quickFillText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 14,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  modalQuickUrls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modalChip: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalChipText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
