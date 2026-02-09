/**
 * Web/Desktop: stub senza react-native-country-picker-modal (evita react-async-hook e bundling).
 * Mostra un modal semplice con campo prefisso (es. +39).
 */
import React, { useState, useEffect } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

export const DARK_THEME = {};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.3)',
  },
  label: {
    color: '#d1d1d1',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: 'rgba(197,160,89,0.3)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#c5a059',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function CountryPickerAdapter({
  visible,
  onClose,
  onSelect,
  countryCode,
  theme,
  withFilter,
  withFlag,
  withCallingCode,
  withCountryNameButton,
}) {
  const [code, setCode] = useState('39');

  useEffect(() => {
    if (visible) setCode('39');
  }, [visible]);

  const handleOk = () => {
    const callingCode = (code || '39').replace(/\D/g, '').slice(0, 4) || '39';
    onSelect?.({ cca2: 'IT', callingCode, flag: '🌐' });
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.label}>Prefisso telefonico (es. 39)</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="39"
            placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={4}
          />
          <TouchableOpacity style={styles.btn} onPress={handleOk}>
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
